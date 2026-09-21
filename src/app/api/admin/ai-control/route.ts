import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { activatePrompt, controlUsage, createPrompt, listAgents, listControlProviders, listExecutions, listPrompts, listTasks, listTools, testControlProvider, upsertAgent, upsertTask, upsertTool } from "@/lib/admin-ai-control";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function admin(){return verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);}

function safeError(e:unknown){
 const m=e instanceof Error?e.message:String(e||"");
 if(/api.?key|token|secret|password|bearer/i.test(m)) return "عملیات ناموفق بود؛ جزئیات حساس نمایش داده نشد.";
 return m.slice(0,300)||"عملیات ناموفق بود.";
}

export async function GET(request:Request){
 const session=await admin(); if(!session)return NextResponse.json({ok:false,error:"دسترسی مدیریت لازم است."},{status:401});
 try{
  const u=new URL(request.url), section=u.searchParams.get("section")||"overview";
  if(section==="providers")return NextResponse.json({ok:true,providers:await listControlProviders()});
  if(section==="tasks")return NextResponse.json({ok:true,tasks:await listTasks()});
  if(section==="agents")return NextResponse.json({ok:true,agents:await listAgents()});
  if(section==="prompts")return NextResponse.json({ok:true,prompts:await listPrompts()});
  if(section==="tools")return NextResponse.json({ok:true,tools:await listTools()});
  if(section==="executions")return NextResponse.json({ok:true,executions:await listExecutions({status:u.searchParams.get("status")||undefined,provider:u.searchParams.get("provider")||undefined,model:u.searchParams.get("model")||undefined})});
  if(section==="usage")return NextResponse.json({ok:true,usage:await controlUsage()});
  return NextResponse.json({ok:true,control:{sections:["providers","tasks","agents","prompts","tools","executions","usage"]},admin:session.username});
 }catch(e){console.error("admin ai control GET",e instanceof Error?e.message:"unknown");return NextResponse.json({ok:false,error:safeError(e)},{status:503});}
}

export async function POST(request:Request){
 const session=await admin(); if(!session)return NextResponse.json({ok:false,error:"دسترسی مدیریت لازم است."},{status:401});
 try{
  const b=await request.json() as Record<string,unknown>, action=String(b.action||"");
  if(action==="test_provider"){const id=String(b.providerId||"").trim();if(!id)return NextResponse.json({ok:false,error:"provider لازم است."},{status:400});return NextResponse.json({ok:true,result:await testControlProvider(id)});}
  if(action==="task_upsert")return NextResponse.json({ok:true,task:await upsertTask(b)});
  if(action==="agent_upsert")return NextResponse.json({ok:true,agent:await upsertAgent(b)});
  if(action==="prompt_create")return NextResponse.json({ok:true,prompt:await createPrompt(b)});
  if(action==="prompt_activate"){const id=String(b.id||"");if(!id)return NextResponse.json({ok:false,error:"شناسه prompt لازم است."},{status:400});const prompt=await activatePrompt(id);return prompt?NextResponse.json({ok:true,prompt}):NextResponse.json({ok:false,error:"prompt پیدا نشد."},{status:404});}
  if(action==="tool_upsert")return NextResponse.json({ok:true,tool:await upsertTool(b)});
  return NextResponse.json({ok:false,error:"action نامعتبر است."},{status:400});
 }catch(e){console.error("admin ai control POST",e instanceof Error?e.message:"unknown");return NextResponse.json({ok:false,error:safeError(e)},{status:503});}
}
