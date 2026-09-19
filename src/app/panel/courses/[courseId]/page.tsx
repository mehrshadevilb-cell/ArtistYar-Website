"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";

type Lesson={id:string;title:string;description:string;sort_order:number;videos:{id:string;title:string;duration_seconds:number|null}[]};

export default function CourseLessonsPage({params}:{params:Promise<{courseId:string}>}) {
  const [courseId,setCourseId]=useState("");
  const [lessons,setLessons]=useState<Lesson[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void params.then(p=>setCourseId(p.courseId))},[params]);
  useEffect(()=>{
    if(!courseId)return;
    void (async()=>{
      try{
        const r=await fetch("/api/education/lessons?courseId="+encodeURIComponent(courseId),{cache:"no-store"});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||"دریافت درس‌ها ناموفق بود.");
        setLessons(d.lessons||[]);
      }catch(e){setError(e instanceof Error?e.message:"دریافت درس‌ها ناموفق بود.");}
      finally{setLoading(false)}
    })();
  },[courseId]);
  return <div className="space-y-5">
    <Link href="/panel/courses" className="inline-flex items-center gap-2 text-xs text-ink-400 hover:text-gold-400"><ArrowRight size={15}/>بازگشت به دوره‌ها</Link>
    <div><p className="eyebrow">آموزش امن</p><h2 className="mt-2 text-2xl font-semibold text-sand-50">درس‌های دوره</h2><p className="mt-2 text-xs text-ink-400">ویدئو فقط پس از احراز دسترسی دوره صادر می‌شود.</p></div>
    {error&&<div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">{error==="course_access_required"?"دسترسی فعال برای این دوره پیدا نشد.":error}</div>}
    {loading?<p className="text-xs text-ink-500">در حال دریافت…</p>:!error&&lessons.length===0?<div className="card-ay p-6 text-sm text-ink-400">هنوز محتوای آموزشی برای این دوره ثبت نشده است.</div>:lessons.map((lesson,i)=><article key={lesson.id} className="card-ay p-5">
      <div className="flex items-start justify-between gap-4"><div><span className="text-[10px] text-gold-400">درس {i+1}</span><h3 className="mt-1 text-base font-medium text-sand-50">{lesson.title}</h3><p className="mt-2 text-xs leading-6 text-ink-400">{lesson.description}</p></div><CheckCircle2 size={19} className="text-gold-400"/></div>
      <div className="mt-4 space-y-2">{lesson.videos.map(v=><Link key={v.id} href={"/panel/courses/"+courseId+"/lessons/"+lesson.id+"?video="+v.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-xs hover:border-gold-400/30"><span className="flex items-center gap-2 text-sand-100"><PlayCircle size={16} className="text-gold-400"/>{v.title}</span><span className="text-ink-500">{v.duration_seconds?Math.floor(v.duration_seconds/60)+":"+String(v.duration_seconds%60).padStart(2,"0"):"ویدئو"}</span></Link>)}</div>
    </article>)}
  </div>;
}
