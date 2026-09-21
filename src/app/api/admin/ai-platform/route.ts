import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import {
  githubConfig,
  installSkillFromGithubUrl,
  listAllSkills,
  listActivity,
  clearActivity,
  pushActivity,
} from "@/lib/admin-ai-platform";
import { githubStatus, listTree, readFile, searchCode } from "@/lib/admin-ai-github";
import { runDevAgent } from "@/lib/admin-ai-dev-agent";
import { deleteMemory, listMemory, upsertMemory } from "@/lib/admin-ai-memory";
import { usageSummary } from "@/lib/admin-ai-usage";
import { listAdminAiModels, syncAdminAiModels, type AdminAiModel } from "@/lib/admin-ai-model-registry";
import { getConfiguredProviders } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  return verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}

function mapPlatformError(error: unknown): { status: number; message: string } {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "";
  const code = raw.trim();
  if (code === "github_not_configured") {
    return { status: 503, message: "GITHUB_TOKEN در secrets تنظیم نشده است. در Render / Cloudflare Worker Secrets بگذار." };
  }
  if (code === "admin_ai_no_healthy_model") {
    return { status: 503, message: "هیچ مدل سالمی فعال نیست. برو تب «مدل‌ها» و Sync بزن (حداقل یک API key مثل OPENAI یا ANTHROPIC لازم است)." };
  }
  if (code === "admin_ai_all_models_failed") {
    return { status: 502, message: "همه مدل‌های فعال خطا دادند. کلید API یا وضعیت provider را در تب اتصال‌ها چک کن." };
  }
  if (code === "admin_ai_storage_not_configured") {
    return {
      status: 503,
      message: "Supabase برای Admin AI تنظیم نشده (SUPABASE_URL + SUPABASE_SECRET_KEY). جدول admin_ai_model_registry هم لازم است.",
    };
  }
  if (code === "empty_task") return { status: 400, message: "متن وظیفه خالی است." };
  if (code === "skill_url_empty" || code === "skill_empty") {
    return { status: 400, message: "لینک skill خالی یا محتوای نامعتبر است." };
  }
  if (code.startsWith("skill_fetch_failed")) {
    return { status: 502, message: `دانلود skill از GitHub ناموفق بود (${code}).` };
  }
  if (code === "no_files_to_commit" || code === "invalid_path") {
    return { status: 400, message: "فایل معتبری برای Draft PR پیشنهاد نشد." };
  }
  if (/relation .* does not exist|Could not find the table|PGRST/i.test(code)) {
    return {
      status: 503,
      message: "جدول Supabase برای Admin AI وجود ندارد (مثلاً admin_ai_model_registry یا حافظه). migration را اجرا کن.",
    };
  }
  if (/github_search_failed|github_read_failed|github_list_failed|base_ref_failed|create_branch_failed|create_pr_failed|write_failed/i.test(code)) {
    return { status: 502, message: `خطای GitHub: ${code}` };
  }
  if (/توکن GitHub نامعتبر|GITHUB_TOKEN/i.test(code)) return { status: 503, message: code };
  if (code && code.length < 280 && !/^Error$/i.test(code)) return { status: 502, message: code };
  return { status: 502, message: "اجرای درخواست پلتفرم ناموفق بود." };
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  const section = new URL(request.url).searchParams.get("section") || "overview";
  try {
    if (section === "overview") {
      const gh = await githubStatus().catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "github_error" }));
      const models: AdminAiModel[] = await listAdminAiModels().catch((): AdminAiModel[] => []);
      const enabled = models.filter((m: AdminAiModel) => m.enabled && m.status === "enabled");
      const providers = getConfiguredProviders();
      return NextResponse.json({
        ok: true,
        overview: {
          github: gh,
          modelsEnabled: enabled.length,
          modelsTotal: models.length,
          skills: (await listAllSkills()).length,
          providersConfigured: providers.length,
          repo: githubConfig().configured ? `${githubConfig().owner}/${githubConfig().repo}` : null,
          activity: await listActivity(12),
        },
      });
    }
    if (section === "skills") return NextResponse.json({ ok: true, skills: await listAllSkills() });
    if (section === "activity") return NextResponse.json({ ok: true, activity: await listActivity(50) });
    if (section === "models") {
      try {
        return NextResponse.json({ ok: true, models: await listAdminAiModels() });
      } catch (e) {
        const mapped = mapPlatformError(e);
        return NextResponse.json({ ok: false, error: mapped.message, models: [] }, { status: mapped.status });
      }
    }
    if (section === "memory") {
      try {
        return NextResponse.json({ ok: true, memory: await listMemory(session.username) });
      } catch (e) {
        const mapped = mapPlatformError(e);
        return NextResponse.json({ ok: false, error: mapped.message, memory: [] }, { status: mapped.status });
      }
    }
    if (section === "connectors") {
      const gh = await githubStatus().catch((e) => ({
        ok: false,
        configured: false,
        error: e instanceof Error ? e.message : String(e),
      }));
      const has = (keys: string[]) => keys.some((k) => Boolean((process.env[k] || "").trim()));
      const ghStatus = gh.ok ? "connected" : (gh as { configured?: boolean }).configured ? "error" : "missing";
      const providers = getConfiguredProviders();
      const providerConnectors = providers.map((p) => ({
        id: `provider:${p.id}`,
        name: p.name,
        status: p.apiKey ? "connected" : "missing",
        envKeys: [] as string[],
        hint: `base: ${p.baseUrl}`,
        detail: { id: p.id, baseUrl: p.baseUrl, chatStyle: p.chatStyle },
      }));
      return NextResponse.json({
        ok: true,
        connectors: [
          {
            id: "github",
            name: "GitHub",
            status: ghStatus,
            detail: gh,
            envKeys: ["GITHUB_TOKEN", "GH_TOKEN", "GITHUB_ADMIN_TOKEN"],
            hint:
              ghStatus === "connected"
                ? "Dev Agent و Draft PR از این اتصال استفاده می‌کنند."
                : "توکن را فقط در Render / Cloudflare Worker Secrets بگذار (هرگز commit نکن).",
          },
          {
            id: "supabase",
            name: "Supabase",
            status:
              has(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) && has(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"])
                ? "connected"
                : "missing",
            envKeys: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"],
            hint: "حافظه، usage، skill و activity به Supabase وابسته است.",
          },
          {
            id: "cloudflare",
            name: "Cloudflare",
            status: has(["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN"]) ? "connected" : "optional",
            envKeys: ["CF_API_TOKEN", "CLOUDFLARE_API_TOKEN"],
            hint: "اختیاری — برای عملیات پیشرفته CF.",
          },
          ...providerConnectors,
        ],
      });
    }
    if (section === "cost") {
      try {
        return NextResponse.json({ ok: true, usage: await usageSummary(session.username) });
      } catch (e) {
        const mapped = mapPlatformError(e);
        return NextResponse.json({ ok: false, error: mapped.message, usage: null }, { status: mapped.status });
      }
    }
    return NextResponse.json({ ok: false, error: "section نامعتبر است." }, { status: 400 });
  } catch (error) {
    console.error("platform GET failed", error instanceof Error ? error.message : error);
    const mapped = mapPlatformError(error);
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "sync_models") {
      pushActivity("info", "شروع Sync مدل‌ها از env / providerها…");
      const models = await syncAdminAiModels({ autoEnable: true });
      pushActivity("done", `Sync تمام — ${models.length} مدل`);
      return NextResponse.json({ ok: true, models });
    }

    if (action === "skill_install") {
      const url = typeof body.url === "string" ? body.url.trim() : "";
      pushActivity("tool", "نصب skill از GitHub", url);
      const skill = await installSkillFromGithubUrl(url, session.username);
      pushActivity("done", `Skill نصب شد: ${skill.name}`, skill.id);
      return NextResponse.json({ ok: true, skill, skills: await listAllSkills() });
    }

    if (action === "activity_clear") {
      await clearActivity();
      return NextResponse.json({ ok: true, activity: [] });
    }

    if (action === "memory_upsert") {
      const scope = typeof body.scope === "string" ? body.scope : "project";
      const key = typeof body.key === "string" ? body.key.trim() : "";
      const value = typeof body.value === "string" ? body.value : "";
      if (!key || !value) return NextResponse.json({ ok: false, error: "key و value لازم است." }, { status: 400 });
      return NextResponse.json({ ok: true, item: await upsertMemory(session.username, scope, key, value) });
    }

    if (action === "memory_delete") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ ok: false, error: "id لازم است." }, { status: 400 });
      await deleteMemory(session.username, id);
      return NextResponse.json({ ok: true });
    }

    if (action === "github_search") {
      const q = typeof body.query === "string" ? body.query.trim() : "";
      if (!q) return NextResponse.json({ ok: false, error: "query لازم است." }, { status: 400 });
      pushActivity("tool", "جستجوی کد GitHub", q);
      return NextResponse.json({ ok: true, items: await searchCode(q) });
    }

    if (action === "github_read") {
      const path = typeof body.path === "string" ? body.path.trim() : "";
      if (!path) return NextResponse.json({ ok: false, error: "path لازم است." }, { status: 400 });
      pushActivity("tool", "خواندن فایل", path);
      return NextResponse.json({ ok: true, file: await readFile(path) });
    }

    if (action === "github_tree") {
      const path = typeof body.path === "string" ? body.path : "src";
      return NextResponse.json({ ok: true, tree: await listTree(path) });
    }

    if (action === "dev_run") {
      const task = typeof body.task === "string" ? body.task : "";
      pushActivity("info", "شروع Dev Agent", task.slice(0, 120));
      const result = await runDevAgent({
        adminUsername: session.username,
        task,
        skillId: typeof body.skillId === "string" ? body.skillId : undefined,
        provider: typeof body.provider === "string" ? body.provider : undefined,
        model: typeof body.model === "string" ? body.model : undefined,
        parallel: body.parallel === true,
        apply: body.apply === true,
        paths: Array.isArray(body.paths)
          ? body.paths.filter((p): p is string => typeof p === "string").slice(0, 8)
          : undefined,
        signal: request.signal,
      });
      if (result.ok) {
        pushActivity(
          "done",
          "Dev Agent تمام شد",
          result.pullRequest?.url || `${result.proposedFiles.length} فایل پیشنهادی`,
        );
      } else {
        pushActivity("error", result.error || "Dev Agent ناموفق");
      }
      return NextResponse.json({
        ok: result.ok,
        result,
        error: result.error || (result.ok ? undefined : "Dev Agent ناموفق بود."),
      });
    }

    return NextResponse.json({ ok: false, error: "action نامعتبر است." }, { status: 400 });
  } catch (error) {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("platform POST failed", error instanceof Error ? error.message : error);
    pushActivity("error", error instanceof Error ? error.message : "platform error");
    const mapped = mapPlatformError(error);
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
}
