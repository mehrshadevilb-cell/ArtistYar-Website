/**
 * Music generation job service.
 * Owns: create → plan → generate → validate → retry/fallback → store → complete.
 * Uses service-role Supabase. Ownership enforced by callers via session.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSpec } from "./intent-parser";
import { selectBestProvider } from "./provider";
import { getMusicProviders, getMusicProvider } from "./registry";
import { validateGeneratedAudio } from "./validate-audio";
import type {
  GenerationJobRecord,
  GenerationJobStatus,
  GenerationSpec,
  GenerationErrorCode,
  ValidationResult,
  PERSIAN_ERROR_MESSAGES,
} from "./types";
import { PERSIAN_ERROR_MESSAGES as ERRORS } from "./types";

const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) throw new Error("supabase_not_configured");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

function correlationId(): string {
  return `mg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function rowToJob(row: Record<string, unknown>): GenerationJobRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: row.status as GenerationJobStatus,
    prompt: String(row.prompt || ""),
    spec: (row.spec || {}) as GenerationSpec,
    providerId: row.provider_id ? String(row.provider_id) : undefined,
    modelId: row.model_id ? String(row.model_id) : undefined,
    providerJobId: row.provider_job_id ? String(row.provider_job_id) : undefined,
    parentJobId: row.parent_job_id ? String(row.parent_job_id) : undefined,
    lineageRootId: row.lineage_root_id ? String(row.lineage_root_id) : undefined,
    variationOfId: row.variation_of_id ? String(row.variation_of_id) : undefined,
    refineOfId: row.refine_of_id ? String(row.refine_of_id) : undefined,
    retryCount: Number(row.retry_count) || 0,
    maxRetries: Number(row.max_retries) || 2,
    creditsCharged: Number(row.credits_charged) || 0,
    creditsRefunded: Number(row.credits_refunded) || 0,
    costUsd: row.cost_usd != null ? Number(row.cost_usd) : undefined,
    errorCode: row.error_code as GenerationErrorCode | undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    validation: row.validation as ValidationResult | undefined,
    outputStorageKey: row.output_storage_key ? String(row.output_storage_key) : undefined,
    outputPublicUrl: row.output_public_url ? String(row.output_public_url) : undefined,
    outputMimeType: row.output_mime_type ? String(row.output_mime_type) : undefined,
    outputDurationMs: row.output_duration_ms != null ? Number(row.output_duration_ms) : undefined,
    outputFileSize: row.output_file_size != null ? Number(row.output_file_size) : undefined,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
    correlationId: String(row.correlation_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    expiresAt: row.expires_at ? String(row.expires_at) : undefined,
  };
}

async function updateJob(
  client: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<GenerationJobRecord> {
  const result = await client
    .from("ai_music_generation_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (result.error) throw new Error(`job_update_failed:${result.error.message}`);
  return rowToJob(result.data as Record<string, unknown>);
}

export async function getJob(jobId: string, userId: string): Promise<GenerationJobRecord | null> {
  const client = db();
  const result = await client
    .from("ai_music_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;
  return rowToJob(result.data as Record<string, unknown>);
}

export async function listUserJobs(
  userId: string,
  opts?: { limit?: number; status?: GenerationJobStatus },
): Promise<GenerationJobRecord[]> {
  const client = db();
  let q = client
    .from("ai_music_generation_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.status) q = q.eq("status", opts.status);
  const result = await q;
  if (result.error) throw new Error(result.error.message);
  return (result.data || []).map((r) => rowToJob(r as Record<string, unknown>));
}

export async function createGenerationJob(input: {
  userId: string;
  prompt: string;
  partialSpec?: Partial<GenerationSpec>;
  idempotencyKey?: string;
}): Promise<GenerationJobRecord> {
  const client = db();
  const prompt = input.prompt.trim().slice(0, 2000);
  if (!prompt) throw new Error("prompt_required");

  if (input.idempotencyKey) {
    const existing = await client
      .from("ai_music_generation_jobs")
      .select("*")
      .eq("user_id", input.userId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing.data) return rowToJob(existing.data as Record<string, unknown>);
  }

  const spec = normalizeSpec({ prompt, ...(input.partialSpec || {}) });
  const corr = correlationId();
  const expiresAt = new Date(Date.now() + JOB_TTL_MS).toISOString();

  const inserted = await client
    .from("ai_music_generation_jobs")
    .insert({
      user_id: input.userId,
      status: "queued",
      prompt,
      spec,
      retry_count: 0,
      max_retries: 2,
      credits_charged: 0,
      credits_refunded: 0,
      idempotency_key: input.idempotencyKey || null,
      correlation_id: corr,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (inserted.error) throw new Error(`job_create_failed:${inserted.error.message}`);
  return rowToJob(inserted.data as Record<string, unknown>);
}

async function storeAudio(
  client: SupabaseClient,
  userId: string,
  jobId: string,
  audio: ArrayBuffer,
  mimeType: string,
): Promise<{ storageKey: string; publicUrl: string; fileSize: number }> {
  const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("ogg") ? "ogg" : "mp3";
  const storageKey = `ai-music-gen/${userId}/${jobId}.${ext}`;
  const buffer = Buffer.from(audio);
  const upload = await client.storage.from(bucket).upload(storageKey, buffer, {
    contentType: mimeType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (upload.error) throw new Error(`storage_failed:${upload.error.message}`);
  const publicUrl = client.storage.from(bucket).getPublicUrl(storageKey).data.publicUrl;
  return { storageKey, publicUrl, fileSize: buffer.length };
}

function failCode(err: unknown): { code: GenerationErrorCode; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|AbortError/i.test(msg)) return { code: "ProviderTimeout", message: ERRORS.ProviderTimeout };
  if (/quota|rate.?limit|429/i.test(msg)) return { code: "ProviderQuotaExceeded", message: ERRORS.ProviderQuotaExceeded };
  if (/unavailable|503|ECONNREFUSED/i.test(msg)) return { code: "ProviderUnavailable", message: ERRORS.ProviderUnavailable };
  if (/storage/i.test(msg)) return { code: "StorageFailed", message: ERRORS.StorageFailed };
  if (/unsupported.?asset/i.test(msg)) return { code: "UnsupportedAsset", message: ERRORS.UnsupportedAsset };
  if (/unsupported.?instrument/i.test(msg)) return { code: "UnsupportedInstrument", message: ERRORS.UnsupportedInstrument };
  return { code: "InternalError", message: ERRORS.InternalError };
}

/**
 * Execute one generation attempt for a job.
 * Safe to call from API after create, or from a worker.
 */
export async function runGenerationJob(jobId: string): Promise<GenerationJobRecord> {
  const client = db();
  const loaded = await client.from("ai_music_generation_jobs").select("*").eq("id", jobId).maybeSingle();
  if (loaded.error) throw new Error(loaded.error.message);
  if (!loaded.data) throw new Error("job_not_found");
  let job = rowToJob(loaded.data as Record<string, unknown>);

  if (["completed", "cancelled", "expired"].includes(job.status)) return job;
  if (job.expiresAt && new Date(job.expiresAt).getTime() < Date.now()) {
    return updateJob(client, jobId, {
      status: "expired",
      error_code: "GenerationExpired",
      error_message: ERRORS.GenerationExpired,
      completed_at: new Date().toISOString(),
    });
  }

  try {
    job = await updateJob(client, jobId, {
      status: "planning",
      started_at: job.startedAt || new Date().toISOString(),
    });

    const providers = getMusicProviders();
    const selection = selectBestProvider(providers, job.spec);
    if (!selection) {
      return updateJob(client, jobId, {
        status: "failed",
        error_code: "ProviderUnavailable",
        error_message: ERRORS.ProviderUnavailable,
        completed_at: new Date().toISOString(),
      });
    }

    const { provider, capability } = selection;
    const plan = await provider.plan(job.spec);
    job = await updateJob(client, jobId, {
      status: "generating",
      provider_id: provider.id,
      model_id: plan.modelId,
      spec: plan.adjustedSpec,
    });

    let lastValidation: ValidationResult | undefined;
    let attempt = job.retryCount;

    while (attempt <= job.maxRetries) {
      try {
        const result = await provider.generate({
          jobId,
          spec: plan.adjustedSpec,
        });

        job = await updateJob(client, jobId, {
          status: "validating",
          provider_job_id: result.providerJobId || null,
          retry_count: attempt,
        });

        const validation = validateGeneratedAudio(result.audioBuffer, result.mimeType, plan.adjustedSpec, {
          durationMsFromProvider: result.durationMs,
        });
        lastValidation = validation;

        if (!validation.passed) {
          attempt += 1;
          if (attempt > job.maxRetries) {
            return updateJob(client, jobId, {
              status: "failed",
              error_code: "ValidationFailed",
              error_message: ERRORS.ValidationFailed,
              validation,
              retry_count: attempt - 1,
              completed_at: new Date().toISOString(),
            });
          }
          // retry same provider with same spec for now
          continue;
        }

        const stored = await storeAudio(client, job.userId, jobId, result.audioBuffer, result.mimeType);

        await client.from("ai_music_generation_outputs").insert({
          job_id: jobId,
          user_id: job.userId,
          storage_key: stored.storageKey,
          public_url: stored.publicUrl,
          mime_type: result.mimeType,
          file_size: stored.fileSize,
          duration_ms: validation.durationMs ?? result.durationMs ?? null,
          sample_rate: validation.sampleRate ?? result.sampleRate ?? null,
          channels: validation.channels ?? result.channels ?? null,
          provider_id: result.providerId,
          model_id: result.modelId,
          validation,
          metadata: result.metadata || {},
          visibility: "library",
        });

        return updateJob(client, jobId, {
          status: "completed",
          output_storage_key: stored.storageKey,
          output_public_url: stored.publicUrl,
          output_mime_type: result.mimeType,
          output_duration_ms: validation.durationMs ?? result.durationMs ?? null,
          output_file_size: stored.fileSize,
          validation,
          retry_count: attempt,
          completed_at: new Date().toISOString(),
        });
      } catch (inner) {
        attempt += 1;
        if (attempt > job.maxRetries) {
          const { code, message } = failCode(inner);
          return updateJob(client, jobId, {
            status: "failed",
            error_code: code,
            error_message: message,
            validation: lastValidation || null,
            retry_count: attempt - 1,
            completed_at: new Date().toISOString(),
          });
        }
      }
    }

    return updateJob(client, jobId, {
      status: "failed",
      error_code: "ValidationFailed",
      error_message: ERRORS.ValidationFailed,
      validation: lastValidation || null,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    const { code, message } = failCode(err);
    return updateJob(client, jobId, {
      status: "failed",
      error_code: code,
      error_message: message,
      completed_at: new Date().toISOString(),
    });
  }
}

export async function cancelJob(jobId: string, userId: string): Promise<GenerationJobRecord | null> {
  const job = await getJob(jobId, userId);
  if (!job) return null;
  if (["completed", "failed", "cancelled", "expired"].includes(job.status)) return job;
  const client = db();
  return updateJob(client, jobId, {
    status: "cancelled",
    error_code: "GenerationCancelled",
    error_message: ERRORS.GenerationCancelled,
    completed_at: new Date().toISOString(),
  });
}

export function publicJobView(job: GenerationJobRecord) {
  return {
    id: job.id,
    status: job.status,
    prompt: job.prompt,
    spec: {
      assetType: job.spec.assetType,
      instrument: job.spec.instrument,
      bpm: job.spec.bpm,
      key: job.spec.key,
      bars: job.spec.bars,
      meter: job.spec.meter,
      role: job.spec.role,
      genre: job.spec.genre,
      regionalStyle: job.spec.regionalStyle,
      performanceStyle: job.spec.performanceStyle,
      durationMs: job.spec.durationMs,
    },
    providerId: job.providerId,
    modelId: job.modelId,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    outputUrl: job.outputPublicUrl,
    outputMimeType: job.outputMimeType,
    outputDurationMs: job.outputDurationMs,
    validation: job.validation
      ? {
          passed: job.validation.passed,
          durationMs: job.validation.durationMs,
          warnings: job.validation.warnings,
        }
      : undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    correlationId: job.correlationId,
  };
}
