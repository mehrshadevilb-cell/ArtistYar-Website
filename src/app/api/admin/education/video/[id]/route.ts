import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { listEducationVideos, signEducationVideo } from "@/lib/educational-videos";

export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}){
  const session=verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if(!session)return NextResponse.json({error:"admin_session_required"},{status:401});
  const {id}=await params;
  try{
    const video=(await listEducationVideos()).find(x=>x.id===id);
    if(!video)return NextResponse.json({error:"video_not_found"},{status:404});
    return NextResponse.json({url:await signEducationVideo(video,300),expiresIn:300},{headers:{"Cache-Control":"private,no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"video_unavailable"},{status:500})}
}
