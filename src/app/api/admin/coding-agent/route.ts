import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/server-admin-auth";
import { CodingAgentRuntime, GitHubWorkspace } from "@/lib/coding-agent";

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

    const runtimeAgent = new CodingAgentRuntime();
    const planning = await runtimeAgent.plan(task, context);
    const proposals = await runtimeAgent.propose(task, context, planning.synthesis);

    return NextResponse.json({
      ok:true,
      repo,
      ref,
      task,
      planning,
      proposals,
      architecture:{
        workspace:"read-only GitHub adapter",
        providers:"existing dynamic AI provider discovery",
        orchestration:"parallel multi-agent waves with failover",
        writes:"must go through reviewed GitHub workflow"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok:false, error:error instanceof Error ? error.message : String(error) },
      { status:500 },
    );
  }
}
