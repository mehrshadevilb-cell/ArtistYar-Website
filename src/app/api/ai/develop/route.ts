import { NextResponse } from "next/server";
import { runDevelopmentTask } from "@/lib/ai-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      task?: unknown;
      context?: unknown;
      maxAgents?: unknown;
      execute?: unknown;
    };

    const task = typeof body.task === "string" ? body.task.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";
    const maxAgents = typeof body.maxAgents === "number" ? body.maxAgents : 12;
    const execute = body.execute !== false;

    if (!task) {
      return NextResponse.json({ ok: false, error: "Task خالی است." }, { status: 400 });
    }

    const result = await runDevelopmentTask(task, context, maxAgents, execute);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: `Development Agent اجرا نشد: ${message}` }, { status: 502 });
  }
}
