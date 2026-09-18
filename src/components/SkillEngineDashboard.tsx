"use client";

import { useEffect, useState } from "react";
import { Activity, Brain, Flame, Gauge, Target, Timer, Trophy } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";
import { useAuth } from "@/components/AuthProvider";

type Skill = {
  key:string; title:string; label:string; short:string; xp:number; level:number; progress:number;
  attempts:number; accuracy:number; recentAccuracy:number; consistency:number; reactionMs:number|null;
  difficulty:number; rating:number; confidence:number; recommendedDifficulty:number;
};
type Dashboard = {
  totalXp:number; level:number; streak:number; overallRating:number; overallAccuracy:number;
  weakestSkill:string; recommendation:string;
  skills:Skill[];
  missions:Array<{id:number;skill:string;title:string;target:number;progress:number;xp_reward:number;completed:boolean}>;
};

function ratingLabel(r:number) {
  if (!r) return "هنوز داده کافی نیست";
  if (r < 220) return "در حال ساخت";
  if (r < 300) return "پایه";
  if (r < 380) return "خوب";
  if (r < 450) return "پیشرفته";
  return "Pro Ear";
}

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
        <div><p className="eyebrow">ADAPTIVE SKILL ENGINE</p><h2 className="mt-2 text-xl text-sand-50">پروفایل واقعی گوش را بساز.</h2><p className="mt-2 text-sm leading-7 text-ink-500">دقت، ثبات، سرعت واکنش و سطح دشواری هر مهارت جداگانه ثبت می‌شود؛ XP فقط برای پیشرفت و بازی‌سازی است.</p></div>
        <SafeLink href="/login" hard className="btn-primary">ورود و شروع تمرین</SafeLink>
      </div>
    </section>
  );

  if (loading && !data) return <section className="mt-8 card-ay p-6 text-sm text-ink-500">در حال ساخت پروفایل شنیداری…</section>;
  if (!data) return null;

  const activeSkills = data.skills.filter(s=>s.attempts>0);
  const weak = [...data.skills].sort((a,b)=>a.rating-b.rating)[0];

  return <section className="mt-8 space-y-4">
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><Gauge size={15} className="text-gold-300"/> Ear Rating</div><strong className="mt-2 block text-2xl text-sand-50">{data.overallRating || "—"}</strong><span className="text-xs text-gold-300">{ratingLabel(data.overallRating)}</span></div>
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><Target size={15} className="text-cyan-200"/> دقت کلی</div><strong className="mt-2 block text-2xl text-sand-50">{data.overallAccuracy || 0}%</strong><span className="text-xs text-ink-500">بر اساس تلاش‌های ثبت‌شده</span></div>
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><Flame size={15} className="text-orange-300"/> Streak</div><strong className="mt-2 block text-2xl text-sand-50">{data.streak}</strong><span className="text-xs text-ink-500">روز پیوسته</span></div>
      <div className="card-ay p-4"><div className="flex items-center gap-2 text-xs text-ink-500"><Trophy size={15} className="text-gold-300"/> XP</div><strong className="mt-2 block text-2xl text-sand-50">{data.totalXp.toLocaleString()}</strong><span className="text-xs text-ink-500">Level {data.level}</span></div>
    </div>

    <div className="card-ay border-gold-400/15 bg-gradient-to-l from-gold-400/[.08] to-white/[.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">NEXT WORKOUT · ADAPTIVE</p><h3 className="mt-2 text-lg text-sand-50">{data.recommendation}</h3><p className="mt-1 text-xs text-ink-500">سیستم بر اساس عملکرد اخیر، سختی تمرین بعدی را تنظیم می‌کند.</p></div>
        <div className="flex items-center gap-2 rounded-full border border-gold-400/20 bg-black/20 px-3 py-2 text-xs text-gold-200"><Brain size={14}/> {activeSkills.length ? "Personalized" : "Baseline"} · ۱۰ دقیقه</div>
      </div>
    </div>

    <div className="card-ay p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">SKILL PROFILE</p><h3 className="mt-2 text-lg text-sand-50">نقشه مهارت شنیداری</h3></div><span className="text-[10px] text-ink-500">Rating مستقل از XP · ۱ تا ۵۰۰</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {data.skills.map(skill=><div key={skill.key} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
          <div className="flex items-center justify-between gap-3"><div><strong className="block text-sm text-sand-100">{skill.title}</strong><span className="text-[10px] text-ink-500">{skill.short}</span></div><span className="text-sm text-gold-300">{skill.rating || "—"}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gold-400 transition-[width]" style={{width:Math.max(2,skill.rating/5)+"%"}}/></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-ink-500">
            <span>دقت اخیر <b className="text-sand-100">{skill.recentAccuracy}%</b></span>
            <span>ثبات <b className="text-sand-100">{skill.consistency}%</b></span>
            <span>{skill.reactionMs ? <>واکنش <b className="text-sand-100">{(skill.reactionMs/1000).toFixed(1)}s</b></> : "واکنش —"}</span>
            <span>هدف سختی <b className="text-sand-100">{skill.recommendedDifficulty}</b></span>
          </div>
        </div>)}
      </div>
    </div>

    <div className="card-ay p-5">
      <div className="flex items-center gap-2"><Activity size={16} className="text-cyan-200"/><div><p className="eyebrow">DAILY WORKOUT</p><h3 className="mt-1 text-lg text-sand-50">تمرین امروز</h3></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{data.missions.map(m=><div key={m.id} className="rounded-xl border border-white/[.07] p-4">
        <div className="flex justify-between gap-3"><strong className="text-xs text-sand-100">{m.title}</strong><span className={m.completed?"text-emerald-300":"text-gold-300"}>{m.progress}/{m.target}</span></div>
        <div className="mt-3 h-1.5 rounded-full bg-white/[.07]"><div className={m.completed?"h-full rounded-full bg-emerald-400":"h-full rounded-full bg-cyan-300"} style={{width:Math.min(100,Math.round(m.progress/m.target*100))+"%"}}/></div>
        <p className="mt-2 text-[10px] text-ink-500">+{m.xp_reward} XP · {m.skill}</p>
      </div>)}</div>
      {!data.missions.length && <p className="mt-4 text-xs text-ink-500"><Timer size={13} className="inline"/> هنوز تمرینی ثبت نشده؛ اولین session پروفایل را فعال می‌کند.</p>}
    </div>
  </section>;
}
