"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, Crown, Flame, RefreshCw, Trophy } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Row = { rank:number; user_id:string; username:string; full_name:string; total_score:number; best_score:number; games_played:number; accuracy:number; streak:number };
type Profile = { totalXp:number; sessions:number; bestByGame:Array<{game_id:string;best_score:number}> };

export function PracticeProgressPanel() {
  const { user } = useAuth();
  const [board,setBoard]=useState<Row[]>([]);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const today=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  const dailyIndex=new Date().getDate()%4;
  const dailyNames=["فرکانس‌یاب","کارآگاه EQ","حس کمپرسور","شکارچی فاز"];

  async function load(){
    setLoading(true); setError("");
    try {
      const boardRes=await fetch("/api/practice/leaderboard?limit=50",{cache:"no-store"});
      if(boardRes.ok){const data=await boardRes.json(); if(data.ok)setBoard(data.leaderboard||[]);}
      if(user?.id){
        const res=await fetch("/api/practice/progress?userId="+encodeURIComponent(user.id),{cache:"no-store"});
        if(res.ok){const data=await res.json(); if(data.ok)setProfile(data);}
      }
    } catch { setError("برای نمایش رکورد آنلاین، اتصال دیتابیس را بررسی کن."); }
    finally{setLoading(false);}
  }
  useEffect(()=>{void load()},[user?.id]);

  return <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
    <div className="card-ay overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[.07] p-5">
        <div><span className="eyebrow">GLOBAL LEADERBOARD</span><h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-sand-50"><Trophy size={19} className="text-gold-300"/> جدول امتیازات</h2></div>
        <button type="button" onClick={()=>void load()} className="btn-ghost !px-3 !py-2" aria-label="به‌روزرسانی"><RefreshCw size={15}/></button>
      </div>
      <div className="divide-y divide-white/[.06]">
        {loading?<p className="p-6 text-sm text-ink-500">در حال دریافت رکوردها…</p>:board.length?board.slice(0,10).map(row=><div key={row.user_id} className="flex items-center gap-3 px-5 py-3.5">
          <span className={`w-7 text-center text-sm font-semibold ${row.rank<=3?"text-gold-300":"text-ink-500"}`}>{row.rank<=3?<Crown size={16} className="mx-auto"/>:row.rank}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-sand-50">{row.full_name||row.username}</strong><span className="text-[10px] text-ink-500">{row.games_played} بازی · دقت {Math.round(row.accuracy||0)}%</span></span>
          <strong className="text-sm text-gold-300">{row.total_score.toLocaleString()} XP</strong>
        </div>):<p className="p-6 text-sm text-ink-500">{error||"هنوز رکوردی ثبت نشده؛ اولین نفر باش."}</p>}
      </div>
    </div>
    <div className="card-ay p-5">
      <span className="eyebrow">YOUR PRACTICE PROFILE</span>
      <h2 className="mt-2 text-xl font-semibold text-sand-50">رکورد و پیشرفت تو</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[.035] p-4"><Award size={17} className="text-gold-300"/><strong className="mt-2 block text-xl text-sand-50">{profile?.totalXp?.toLocaleString()||0}</strong><span className="text-[11px] text-ink-500">XP ثبت‌شده</span></div>
        <div className="rounded-2xl bg-white/[.035] p-4"><Flame size={17} className="text-orange-300"/><strong className="mt-2 block text-xl text-sand-50">{profile?.sessions||0}</strong><span className="text-[11px] text-ink-500">جلسه تمرین</span></div>
      </div>
      <div className="mt-5 rounded-2xl border border-gold-400/15 bg-gold-400/[.05] p-4"><span className="flex items-center gap-2 text-xs text-gold-300"><CalendarDays size={15}/> چالش روزانه · {today}</span><strong className="mt-2 block text-sm text-sand-50">{dailyNames[dailyIndex]}</strong><p className="mt-1 text-xs leading-6 text-ink-500">با تکمیل چالش، رکورد همان روز در پروفایل و جدول ثبت می‌شود.</p></div>
      {!user?<p className="mt-4 text-xs leading-6 text-ink-500">برای ذخیره‌ی رکورد به پروفایل وارد شو. بازی‌های فعلی بدون ورود هم قابل استفاده‌اند.</p>:null}
    </div>
  </section>;
}
