import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const ecosystemDb = url && secret
  ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export const MAX_PROJECT_NAME = 160;
export const MAX_NOTE_LENGTH = 10000;
export const MAX_USER_FILE_BYTES = 50 * 1024 * 1024;

export const FILE_CATEGORIES = ["audio","stem","mix","master","reference","ai_generation","practice","other"] as const;
export type FileCategory = typeof FILE_CATEGORIES[number];

export function normalizeCategory(value: unknown): FileCategory {
  const v = String(value || "").trim().toLowerCase();
  return (FILE_CATEGORIES as readonly string[]).includes(v) ? v as FileCategory : "other";
}

export function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function ownedProject(userId: string, projectId: string) {
  if (!ecosystemDb) throw new Error("supabase_not_configured");
  const result = await ecosystemDb.from("artistyar_projects").select("*").eq("id", projectId).eq("user_id", userId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function logProjectActivity(input: {
  userId: string; projectId: string; eventType: string; entityType?: string; entityId?: string; payload?: Record<string, unknown>;
}) {
  if (!ecosystemDb) return;
  await ecosystemDb.from("artistyar_project_activity").insert({
    user_id: input.userId, project_id: input.projectId,
    event_type: input.eventType.slice(0, 80),
    entity_type: input.entityType?.slice(0, 80) || null,
    entity_id: input.entityId?.slice(0, 120) || null,
    payload: input.payload || {},
  });
}
