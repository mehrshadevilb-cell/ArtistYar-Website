"use client";

import { useEffect, useState } from "react";
import { Flame, Target, TrendingUp, Trophy } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";
import { useAuth } from "@/components/AuthProvider";

type Dashboard = {
  totalXp:number; level:number; streak:number;
  skills:Array<{key:string;title:string;label:string;xp:number;level:number;accuracy:number;progress:number}>;
  missions:Array<{id:number;skill:string;title:string;target:number;progress:number;xp_reward:number;completed:boolean}>;
};

export function SkillEngineDashboard() {
  const { user } = useAuth();
  const [data,setData] = useState<Dashboard|null>(null);
  const [loading,setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) { setData(null); return; }
    setLoading(true);
    fetch("/api/practice/skills?userId="+encodeURIComponent(user.id),{cache:"no-store",credentials:"include"})
      .then(r=>r.json()).then(d=>{if(d?.ok)setData(d)}).catch(()=>{}).finally(()=>setLoading(false));
  },[user?.id]);

  if (!user) return (
    <section className="mt-8 rounded-2xl border border-white/[.07] bg-white/[.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="eyebrow">SKILL ENGINE</p><h2 className="mt-2 text-xl text-sand-50">پروفایل مهارتت را بساز.</h2><p className="mt-2 text-sm leading-7 text-ink-500">با ورود به حساب، XP، سطح هر مهارت و Daily Mission به‌صورت دائمی ثبت می‌شود.</p></div>
        <SafeLink href="/login" hard className="btn-primary">ورود و شروع تمرین</SafeLink>
      </div>
    </section>
  );

  if (loading && !data) return <section className="mt-8 card-ay p-6 text-sm text-ink-500">در حال ساخت Skill Profile…</section>;
  if (!data) return null;

  return <section className="mt-8 space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><TrendingUp size={15} className="text-gold-300"/> سطح کلی</div><strong className="mt-2 block text-2xl text-sand-50">Level {data.level}</strong><span className="text-xs text-ink-500">{data.totalXp} XP</span></div>
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><Flame size={15} className="text-orange-300"/> Streak</div><strong className="mt-2 block text-2xl text-sand-50">{data.streak}</strong><span className="text-xs text-ink-500">روز تمرین پیوسته</span></div>
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><Trophy size={15} className="text-gold-300"/> Daily Mission</div><strong className="mt-2 block text-2xl text-sand-50">{data.missions.filter(m=>m.completed).length}/{data.missions.length}</strong><span className="text-xs text-ink-500">ماموریت تکمیل‌شده</span></div>
    </div>

    <div className="card-ay p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">SKILL GRAPH / مهارت‌ها</p><h3 className="mt-2 text-lg text-sand-50">پروفایل شنیداری و صوتی</h3></div><span className="text-[10px] text-ink-500">۰ تا ۵۰۰ Level</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {data.skills.map(skill=><div key={skill.key} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
          <div className="flex items-center justify-between gap-3"><div><strong className="block text-sm text-sand-100">{skill.title}</strong><span className="text-[10px] text-ink-500">{skill.label}</span></div><span className="text-xs text-gold-300">Lv {skill.level}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gold-400 transition-[width]" style={{width:skill.progress+"%"}}/></div>
          <div className="mt-2 flex justify-between text-[10px] text-ink-500"><span>{skill.xp} XP</span><span>{skill.accuracy}% accuracy</span></div>
        </div>)}
      </div>
    </div>

    <div className="card-ay p-5 sm:p-6">
      <div className="flex items-center gap-2"><Target size={16} className="text-cyan-200"/><div><p className="eyebrow">DAILY MISSION</p><h3 className="mt-1 text-lg text-sand-50">هدف امروز</h3></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{data.missions.map(m=><div key={m.id} className="rounded-xl border border-white/[.07] p-4">
        <div className="flex justify-between gap-3"><strong className="text-xs text-sand-100">{m.title}</strong><span className={m.completed?"text-emerald-300":"text-gold-300"}>{m.progress}/{m.target}</span></div>
        <div className="mt-3 h-1.5 rounded-full bg-white/[.07]"><div className={m.completed?"h-full rounded-full bg-emerald-400":"h-full rounded-full bg-cyan-300"} style={{width:Math.min(100,Math.round(m.progress/m.target*100))+"%"}}/></div>
        <p className="mt-2 text-[10px] text-ink-500">+{m.xp_reward} XP · {m.skill}</p>
      </div>)}</div>
    </div>
  </section>;
}
