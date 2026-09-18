import { NextResponse } from "next/server";
import { runMultiAgent } from "@/lib/ai-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { task?:unknown; context?:unknown; maxAgents?:unknown };
    const task = typeof body.task === "string" ? body.task.trim() : "";
    const context = typeof body.context === "string" ? body.context : "";
    const maxAgents = typeof body.maxAgents === "number" ? body.maxAgents : 12;
    if (!task) return NextResponse.json({ok:false,error:"Task خالی است."},{status:400});
    const result = await runMultiAgent(task, context, maxAgents);
    return NextResponse.json(result);
  } catch(error) {
    const message=error instanceof Error?error.message:String(error);
    return NextResponse.json({ok:false,error:`Multi-Agent اجرا نشد: ${message}`},{status:502});
  }
}
