"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle, RotateCcw } from "lucide-react";

export default function LessonPlayer({params}:{params:Promise<{courseId:string;lessonId:string}>}) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const [ids,setIds]=useState<{courseId:string;lessonId:string}|null>(null);
  const [src,setSrc]=useState("");
  const [duration,setDuration]=useState(0);
  const [position,setPosition]=useState(0);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void params.then(p=>setIds(p))},[params]);
  useEffect(()=>{
    if(!ids)return;
    const qs=new URLSearchParams(window.location.search);
    void (async()=>{
      try{
        const list=await fetch("/api/education/lessons?courseId="+encodeURIComponent(ids.courseId),{cache:"no-store"}).then(r=>r.json());
        const lesson=(list.lessons||[]).find((x:any)=>x.id===ids.lessonId);
        const selected=lesson?.videos?.find((x:any)=>x.id===(qs.get("video")||""))||lesson?.videos?.[0];
        if(!selected)throw new Error("این ویدئو پیدا نشد.");
        const signed=await fetch("/api/education/video/"+selected.id,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"ویدئو قابل دریافت نیست.");return d});
        const progress=await fetch("/api/education/progress?lessonId="+encodeURIComponent(ids.lessonId),{cache:"no-store"}).then(r=>r.json());
        setSrc(signed.url);setPosition(Number(progress.position_seconds||0));
      }catch(e){setMessage(e instanceof Error?e.message:"خطا در آماده‌سازی ویدئو.")}finally{setLoading(false)}
    })();
  },[ids]);
  useEffect(()=>{
    const el=videoRef.current;if(!el||!src)return;
    const onLoaded=()=>{if(position>0&&position<el.duration-2)el.currentTime=position;setDuration(el.duration||0)};
    const onTime=()=>setPosition(el.currentTime);
    const onEnded=()=>void save(true);
    el.addEventListener("loadedmetadata",onLoaded);el.addEventListener("timeupdate",onTime);el.addEventListener("ended",onEnded);
    return()=>{el.removeEventListener("loadedmetadata",onLoaded);el.removeEventListener("timeupdate",onTime);el.removeEventListener("ended",onEnded)};
  },[src]);
  async function save(completed=false){
    if(!ids)return;
    await fetch("/api/education/progress",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId:Number(ids.courseId),lessonId:ids.lessonId,positionSeconds:Math.floor(videoRef.current?.currentTime||position),completed})}).catch(()=>{});
  }
  useEffect(()=>{const t=window.setInterval(()=>{if(duration>0)void save(position/duration>=.9)},15000);return()=>window.clearInterval(t)},[ids,position,duration]);
  return <div className="space-y-5">
    <Link href={"/panel/courses/"+(ids?.courseId||"")} className="inline-flex items-center gap-2 text-xs text-ink-400 hover:text-gold-400"><ArrowRight size={15}/>بازگشت به درس‌ها</Link>
    <div className="card-ay overflow-hidden p-2 sm:p-3">
      {loading?<div className="aspect-video grid place-items-center text-xs text-ink-500"><RotateCcw className="animate-spin" size={18}/></div>:src?<video ref={videoRef} className="aspect-video w-full rounded-xl bg-black" controls playsInline preload="metadata" src={src}/>:<div className="aspect-video grid place-items-center p-6 text-center text-sm text-red-200">{message||"ویدئو در دسترس نیست."}</div>}
    </div>
    <div className="card-ay p-5"><div className="flex items-center gap-2"><PlayCircle size={17} className="text-gold-400"/><span className="text-sm text-sand-50">ادامه مشاهده</span></div><p className="mt-2 text-xs text-ink-400">{duration?Math.floor(position/60)+":"+String(Math.floor(position%60)).padStart(2,"0")+" از "+Math.floor(duration/60)+":"+String(Math.floor(duration%60)).padStart(2,"0"):"پخش ویدئو برای ثبت پیشرفت ادامه دارد."}</p></div>
  </div>;
}
