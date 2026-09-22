import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { ecosystemDb, logProjectActivity, ownedProject, safeText } from "@/lib/user-ecosystem";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function auth(){return verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);}
export async function GET(_r:Request,ctx:{params:Promise<{id:string}>}){
 const s=await auth(); if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const {id}=await ctx.params; const p=await ownedProject(s.id,id); if(!p)return NextResponse.json({ok:false,error:"project_not_found"},{status:404});
 if(!ecosystemDb)return NextResponse.json({ok:false,error:"ذخیره‌سازی پیکربندی نشده است."},{status:503});
 const [files,notes,analyses,generations,activity]=await Promise.all([
  ecosystemDb.from("artistyar_project_files").select("*").eq("project_id",id).eq("user_id",s.id).order("updated_at",{ascending:false}),
  ecosystemDb.from("artistyar_project_notes").select("*").eq("project_id",id).eq("user_id",s.id).order("updated_at",{ascending:false}),
  ecosystemDb.from("artistyar_project_analyses").select("id,analysis_type,source_file_id,payload,created_at").eq("project_id",id).eq("user_id",s.id).order("created_at",{ascending:false}).limit(30),
  ecosystemDb.from("artistyar_project_generations").select("*").eq("project_id",id).eq("user_id",s.id).order("created_at",{ascending:false}).limit(30),
  ecosystemDb.from("artistyar_project_activity").select("*").eq("project_id",id).eq("user_id",s.id).order("created_at",{ascending:false}).limit(50),
 ]);
 return NextResponse.json({ok:true,project:p,files:files.data||[],notes:notes.data||[],analyses:analyses.data||[],generations:generations.data||[],activity:activity.data||[]});
}
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){
 const s=await auth(); if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const {id}=await ctx.params; if(!await ownedProject(s.id,id))return NextResponse.json({ok:false,error:"project_not_found"},{status:404});
 if(!ecosystemDb)return NextResponse.json({ok:false,error:"ذخیره‌سازی پیکربندی نشده است."},{status:503});
 const body=await request.json().catch(()=>null) as any;
 const patch:any={updated_at:new Date().toISOString()};
 if(body?.name!==undefined){const name=safeText(body.name,160);if(!name)return NextResponse.json({ok:false,error:"نام پروژه الزامی است."},{status:400});patch.name=name;}
 if(body?.description!==undefined)patch.description=safeText(body.description,2000);
 if(body?.status!==undefined && ["active","archived","completed"].includes(body.status))patch.status=body.status;
 const {data,error}=await ecosystemDb.from("artistyar_projects").update(patch).eq("id",id).eq("user_id",s.id).select("*").single();
 if(error)return NextResponse.json({ok:false,error:"ویرایش پروژه ناموفق بود."},{status:500});
 await logProjectActivity({userId:s.id,projectId:id,eventType:"project_updated",entityType:"project",entityId:id,payload:{fields:Object.keys(patch)}});
 return NextResponse.json({ok:true,project:data});
}
export async function DELETE(_r:Request,ctx:{params:Promise<{id:string}>}){
 const s=await auth();if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const {id}=await ctx.params;if(!await ownedProject(s.id,id))return NextResponse.json({ok:false,error:"project_not_found"},{status:404});
 if(!ecosystemDb)return NextResponse.json({ok:false,error:"ذخیره‌سازی پیکربندی نشده است."},{status:503});
 const {data:files}=await ecosystemDb.from("artistyar_project_files").select("storage_path").eq("project_id",id).eq("user_id",s.id);
 if(files?.length){const storage=ecosystemDb.storage.from(process.env.SUPABASE_BUCKET||"artistyar-media");const fileIds=files.map(f=>f.storage_path);const {data:versions}=await ecosystemDb.from("artistyar_project_file_versions").select("storage_path").eq("project_id",id).eq("user_id",s.id);await storage.remove([...fileIds,...(versions||[]).map(v=>v.storage_path)]);}
 const {error}=await ecosystemDb.from("artistyar_projects").delete().eq("id",id).eq("user_id",s.id);
 if(error)return NextResponse.json({ok:false,error:"حذف پروژه ناموفق بود."},{status:500});
 return NextResponse.json({ok:true});
}
