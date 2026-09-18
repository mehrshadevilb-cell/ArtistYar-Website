import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/server-admin-auth";
import { GitHubWorkspace } from "@/lib/coding-agent";
import { runDevelopmentTask } from "@/lib/ai-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok:false, error:"Unauthorized" }, { status:401 });

  try {
    const body = await request.json() as { task?: unknown; files?: unknown[] };
    const task = typeof body.task === "string" ? body.task.trim() : "";
    if (!task) return NextResponse.json({ ok:false, error:"task is required" }, { status:400 });

    const token = (process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "").trim();
    if (!token) return NextResponse.json({ ok:false, error:"GITHUB_TOKEN is not configured" }, { status:503 });

    const repo = (process.env.GITHUB_REPOSITORY || "mehrshadevilb-cell/ArtistYar-Website").trim();
    const ref = (process.env.GITHUB_DEFAULT_BRANCH || "main").trim();
    const workspace = new GitHubWorkspace(repo, ref, token);
    const requested = Array.isArray(body.files) ? body.files.map(String).slice(0, 20) : [];
    const paths = requested.length ? requested : ["package.json","tsconfig.json","src/lib/ai-providers.ts","src/lib/ai-agent.ts"];
    const files = await workspace.readMany(paths);
    const context = files.map(file => `FILE: ${file.path}\n${file.content.slice(0,18000)}`).join("\n\n---\n\n");

    const result = await runDevelopmentTask(task, context, 12, true);

    return NextResponse.json({
      ...result,
      repo,
      ref,
      architecture:{
        lifecycle:"discover → plan → parallel code → review → select → branch → PR",
        providers:"dynamic live provider/model discovery with provider failover",
        concurrency:"parallel waves with adaptive early-stop",
        safety:"isolated Git branch + reviewed pull request",
      }
    });
  } catch (error) {
    return NextResponse.json({ ok:false, error:error instanceof Error ? error.message : String(error) }, { status:500 });
  }
}
