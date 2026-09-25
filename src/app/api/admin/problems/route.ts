import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { getServiceSupabase } from "@/lib/admin/supabase-admin";
import { runIntegrityScan } from "@/lib/admin/integrity";
import { writeAuditLog } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function session(){return verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)}

export async function GET(request:Request){
  if(!await session())return NextResponse.json({error:"admin_session_required"},{status:401});
  const db=getServiceSupabase(); if(!db)return NextResponse.json({problems:[],warning:"supabase_not_configured"});
  const url=new URL(request.url); const status=url.searchParams.get("status"); const refresh=url.searchParams.get("refresh")==="1";
  if(refresh){
    const report=await runIntegrityScan(50);
    const findings=report.findings.filter(x=>x.id!=="clean");
    for(const f of findings){
      await db.from("admin_problems").upsert({id:f.id,severity:f.severity,category:f.category,title:f.title,description:f.description,entity_type:f.entity_type||null,entity_id:null,detected_at:new Date().toISOString(),recommended_action:"مورد را بررسی و پس از رفع علت، وضعیت را Resolve کنید.",href:f.entity_type?"/admin/integrity":"/admin/system",updated_at:new Date().toISOString()},{onConflict:"id"});
    }
    await writeAuditLog({actor:"admin",action:"integrity.scan",resource_type:"admin_problems",resource_id:null,after:{findings:findings.length,checks_run:report.checks_run}});
  }
  let q=db.from("admin_problems").select("*").order("detected_at",{ascending:false}).limit(200);
  if(status)q=q.eq("status",status);
  const {data,error}=await q;if(error)return NextResponse.json({error:"problems_query_failed"},{status:500});
  return NextResponse.json({problems:data||[]});
}
export async function PATCH(request:Request){
  const s=await session();if(!s)return NextResponse.json({error:"admin_session_required"},{status:401});
  const body=await request.json().catch(()=>({}));const id=String(body.id||"");const status=String(body.status||"");
  if(!id||!["open","acknowledged","resolved"].includes(status))return NextResponse.json({error:"invalid_problem_status"},{status:400});
  const db=getServiceSupabase();if(!db)return NextResponse.json({error:"supabase_not_configured"},{status:503});
  const {data,error}=await db.from("admin_problems").update({status,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
  if(error)return NextResponse.json({error:"problem_update_failed"},{status:500});
  await writeAuditLog({actor:s.username,action:status==="acknowledged"?"problem.acknowledge":"problem.resolve",resource_type:"admin_problem",resource_id:id,after:{status}});
  return NextResponse.json(data);
}
