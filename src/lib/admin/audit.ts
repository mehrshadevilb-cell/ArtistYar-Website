/**
 * Admin audit-log foundation.
 * Records sensitive mutations. Never stores secrets, tokens, or passwords.
 */

import { createHash } from "crypto";

export type AuditAction =
  | "settings.update"
  | "content.update"
  | "homepage.update"
  | "user.update"
  | "user.create"
  | "payment.review"
  | "payment.update"
  | "permission.change"
  | "feature_flag.update"
  | "media.upload"
  | "media.delete"
  | "education.update"
  | "system.action"
  | "problem.acknowledge"
  | "problem.resolve"
  | "integrity.scan"
  | "admin.login"
  | "admin.logout";

export type AuditEntry = {
  id?: string;
  actor: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  timestamp: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

const SENSITIVE_KEYS = /password|secret|token|api[_-]?key|authorization|cookie|private[_-]?key|credential/i;

export function sanitizeAuditPayload(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 2000) return value.slice(0, 2000) + "…";
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitizeAuditPayload(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = sanitizeAuditPayload(v, depth + 1);
  }
  return out;
}

const MEMORY_AUDIT: AuditEntry[] = [];
const MEMORY_LIMIT = 200;

export function pushMemoryAudit(entry: AuditEntry): void {
  MEMORY_AUDIT.unshift(entry);
  if (MEMORY_AUDIT.length > MEMORY_LIMIT) MEMORY_AUDIT.length = MEMORY_LIMIT;
}

export function listMemoryAudit(limit = 50): AuditEntry[] {
  return MEMORY_AUDIT.slice(0, Math.min(limit, MEMORY_LIMIT));
}

export async function writeAuditLog(
  entry: Omit<AuditEntry, "timestamp"> & { timestamp?: string },
): Promise<void> {
  const record: AuditEntry = {
    ...entry,
    id:
      entry.id ||
      createHash("sha256")
        .update(`${entry.actor}:${entry.action}:${Date.now()}:${Math.random()}`)
        .digest("hex")
        .slice(0, 16),
    timestamp: entry.timestamp || new Date().toISOString(),
    before: entry.before
      ? (sanitizeAuditPayload(entry.before) as Record<string, unknown>)
      : null,
    after: entry.after
      ? (sanitizeAuditPayload(entry.after) as Record<string, unknown>)
      : null,
    metadata: entry.metadata
      ? (sanitizeAuditPayload(entry.metadata) as Record<string, unknown>)
      : null,
  };

  pushMemoryAudit(record);

  try {
    const { getServiceSupabase } = await import("@/lib/admin/supabase-admin");
    const supabase = getServiceSupabase();
    if (!supabase) return;
    await supabase.from("admin_audit_logs").insert({
      id: record.id,
      actor: record.actor,
      action: record.action,
      resource_type: record.resource_type,
      resource_id: record.resource_id,
      created_at: record.timestamp,
      before_state: record.before,
      after_state: record.after,
      metadata: record.metadata,
    });
  } catch {
    // Table may not exist yet; memory buffer remains.
  }
}
