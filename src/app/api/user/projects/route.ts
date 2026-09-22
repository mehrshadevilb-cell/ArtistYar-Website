import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { ecosystemDb, logProjectActivity, safeText } from "@/lib/user-ecosystem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function user() {
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  return session;
}

export async function GET() {
  const session = await user();
  if (!session) return NextResponse.json({ ok:false, error:"unauthorized" }, {status:401});
  if (!ecosystemDb) return NextResponse.json({ok:false,error:"ذخیره‌سازی پیکربندی نشده است."},{status:503});
  const { data, error } = await ecosystemDb.from("artistyar_projects").select("*").eq("user_id",session.id).order("updated_at",{ascending:false});
  if(error) return NextResponse.json({ok:false,error:"خطا در دریافت پروژه‌ها."},{status:500});
  return NextResponse.json({ok:true,items:data||[]},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:Request) {
  const session=await user();
  if(!session) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  if(!ecosystemDb) return NextResponse.json({ok:false,error:"ذخیره‌سازی پیکربندی نشده است."},{status:503});
  const body=await request.json().catch(()=>null) as any;
  const name=safeText(body?.name,160), description=safeText(body?.description,2000);
  if(!name) return NextResponse.json({ok:false,error:"نام پروژه الزامی است."},{status:400});
  const {data,error}=await ecosystemDb.from("artistyar_projects").insert({user_id:session.id,name,description}).select("*").single();
  if(error) return NextResponse.json({ok:false,error:"ساخت پروژه ناموفق بود."},{status:500});
  await logProjectActivity({userId:session.id,projectId:data.id,eventType:"project_created",entityType:"project",entityId:data.id});
  return NextResponse.json({ok:true,project:data},{status:201});
}
