import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function db() {
  if (!supabase) throw new Error("admin_ai_storage_not_configured");
  return supabase;
}

export async function listMemory(adminUsername: string, limit = 50) {
  const result = await db()
    .from("admin_ai_memory")
    .select("id,scope,key,value,created_at,updated_at")
    .eq("admin_username", adminUsername)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (result.error) throw result.error;
  return result.data || [];
}

export async function upsertMemory(adminUsername: string, scope: string, key: string, value: string) {
  const now = new Date().toISOString();
  const result = await db()
    .from("admin_ai_memory")
    .upsert(
      {
        admin_username: adminUsername,
        scope: scope.slice(0, 64),
        key: key.slice(0, 120),
        value: value.slice(0, 8000),
        updated_at: now,
      },
      { onConflict: "admin_username,scope,key" },
    )
    .select("id,scope,key,value,created_at,updated_at")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteMemory(adminUsername: string, id: string) {
  const result = await db().from("admin_ai_memory").delete().eq("id", id).eq("admin_username", adminUsername);
  if (result.error) throw result.error;
}

export async function memoryContext(adminUsername: string, maxChars = 4000): Promise<string> {
  const rows = await listMemory(adminUsername, 30);
  if (!rows.length) return "";
  const lines = rows.map((r) => `- [${r.scope}] ${r.key}: ${String(r.value).slice(0, 400)}`);
  return lines.join("\n").slice(0, maxChars);
}
