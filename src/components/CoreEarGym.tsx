"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Play, RotateCcw, Zap } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type GameId = "tone" | "eq" | "compressor" | "phase";
type Question = { gameId:GameId; prompt:string; hint:string; answer:string|number; options:Array<string|number>; audio:Record<string,number|string>; difficulty:number };

const META:Record<GameId,{title:string;desc:string}> = {
  tone:{title:"Frequency",desc:"فرکانس را با گوش پیدا کن"},
  eq:{title:"EQ",desc:"محل تغییر EQ را تشخیص بده"},
  compressor:{title:"Compression",desc:"رفتار کمپرسور را بشنو"},
  phase:{title:"Phase",desc:"Polarity و تصویر مرکز را تشخیص بده"},
};

function freq(m:number){return 440*Math.pow(2,(m-69)/12);}
function makeNoise(c:AudioContext,seconds:number){
  const b=c.createBuffer(1,Math.floor(c.sampleRate*seconds),c.sampleRate);
  const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  return b;
}

async function playQuestion(q:Question){
  const A=window.AudioContext||(window as any).webkitAudioContext; if(!A)return;
  const c=new A(); const now=c.currentTime+0.03;
  const out=c.createGain(); out.gain.value=0.22; out.connect(c.destination);
  if(q.gameId==="tone"){
    const o=c.createOscillator(); const g=c.createGain(); o.type="sine"; o.frequency.value=Number(q.audio.frequency); g.gain.value=.16; o.connect(g).connect(out); o.start(now); o.stop(now+1.25);
  } else if(q.gameId==="eq"){
    const src=c.createBufferSource(); const f=c.createBiquadFilter(); src.buffer=makeNoise(c,1.5); f.type="peaking"; f.frequency.value=Number(q.audio.frequency); f.Q.value=1.1; f.gain.value=Number(q.audio.gain)||6; src.connect(f).connect(out); src.start(now); src.stop(now+1.5);
  } else if(q.gameId==="compressor"){
    const src=c.createBufferSource(); const comp=c.createDynamicsCompressor();
    src.buffer=makeNoise(c,1.5); comp.attack.value=Number(q.audio.attack)||.02; comp.release.value=Number(q.audio.release)||.2; comp.ratio.value=Number(q.audio.ratio)||4; comp.threshold.value=Number(q.audio.threshold)||-24;
    src.connect(comp).connect(out); src.start(now); src.stop(now+1.5);
  } else {
    const merger=c.createChannelMerger(2); const a=c.createOscillator(); const b=c.createOscillator(); const ga=c.createGain(); const gb=c.createGain();
    a.frequency.value=180; b.frequency.value=180; ga.gain.value=.18; gb.gain.value=String(q.audio.phase)==="inverted"?-.18:.18;
    a.connect(ga).connect(merger,0,0); b.connect(gb).connect(merger,0,1); merger.connect(c.destination); a.start(now); b.start(now); a.stop(now+1.1); b.stop(now+1.1);
  }
  setTimeout(()=>void c.close(),1900);
}

export function CoreEarGym({ onBack }:{onBack?:()=>void}){
  const {user}=useAuth();
  const [game,setGame]=useState<GameId>("tone");
  const [q,setQ]=useState<Question|null>(null);
  const [answer,setAnswer]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [rating,setRating]=useState<number|null>(null);
  const started=useRef(0);

  const loadAdaptive=useCallback(async()=>{
    if(!user?.id)return;
    setLoading(true); setAnswer(null);
    try{
      const p=await fetch("/api/practice/adaptive?userId="+encodeURIComponent(user.id),{cache:"no-store",credentials:"include"}).then(r=>r.json());
      const match=p?.exercises?.find((x:{gameId?:string})=>x.gameId===game);
      const level=Math.max(1,Math.min(500,Number(match?.difficulty)||250));
      const d=await fetch("/api/practice/question",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:game,level,userId:user.id})}).then(r=>r.json());
      if(d?.ok){setQ(d.question); setRating(Number(p.overallRating)||null); started.current=Date.now();}
    }catch{} finally{setLoading(false);}
  },[user?.id,game]);

  useEffect(()=>{void loadAdaptive()},[loadAdaptive]);

  const choose=async(value:string)=>{
    if(!q||answer)return;
    setAnswer(value);
    const ok=String(q.answer)===value;
    const responseTimeMs=started.current?Math.max(1,Date.now()-started.current):0;
    if(user?.id){
      await fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({
        userId:user.id,username:user.username,fullName:user.fullName,telegramId:user.telegramId,
        gameId:q.gameId,score:ok?20:0,accuracy:ok?100:0,streak:1,bestScore:ok?20:0,
        metadata:{source:"core_ear_gym",difficulty:q.difficulty,responseTimeMs,correct:ok,itemKey:q.prompt},
      })}).catch(()=>{});
    }
  };

  return <section className="mt-10 card-ay overflow-hidden">
    <div className="border-b border-white/[.07] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="eyebrow text-cyan-200">CORE EAR GYM · ADAPTIVE</p><h2 className="mt-2 text-xl font-semibold text-sand-50">تمرین واقعی گوش</h2><p className="mt-1 text-xs leading-6 text-ink-500">Frequency · EQ · Compression · Phase — سختی از عملکرد قبلی تو می‌آید.</p></div>
        {rating?<span className="rounded-full border border-gold-400/20 bg-gold-400/[.06] px-3 py-1.5 text-[11px] text-gold-200">Ear Rating {rating}</span>:null}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(META) as GameId[]).map(id=><button key={id} type="button" onClick={()=>setGame(id)} className={`rounded-xl border px-3 py-3 text-right transition ${game===id?"border-gold-400/40 bg-gold-400/[.08]":"border-white/[.07] bg-white/[.02]"}`}><strong className="block text-xs text-sand-100">{META[id].title}</strong><span className="mt-1 block text-[10px] text-ink-500">{META[id].desc}</span></button>)}
      </div>
    </div>
    <div className="p-5 sm:p-7">
      {loading||!q?<div className="py-8 text-center text-sm text-ink-500">در حال آماده‌سازی تمرین تطبیقی…</div>:<>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-ink-500">Difficulty {q.difficulty}/500</p><h3 className="mt-2 text-lg text-sand-50">{q.prompt}</h3><p className="mt-1 text-xs text-ink-500">{q.hint}</p></div><button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={()=>void playQuestion(q)}><Play size={14} fill="currentColor"/> پخش</button></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">{q.options.map(o=>{const s=String(o);const correct=answer!==null&&s===String(q.answer);const picked=answer===s;return <button key={s} disabled={!!answer} onClick={()=>void choose(s)} className={`rounded-xl border p-3 text-sm transition ${correct?"border-emerald-400/50 bg-emerald-400/10 text-emerald-200":picked?"border-red-400/40 bg-red-400/10 text-red-200":"border-white/10 text-ink-200 hover:border-gold-400/40"}`}>{s}</button>})}</div>
        {answer?<div className="mt-5 flex flex-wrap items-center gap-3"><span className={String(q.answer)===answer?"text-emerald-200":"text-red-200"}>{String(q.answer)===answer?"درست · مهارت ثبت شد":"نادرست · پاسخ صحیح: "+String(q.answer)}</span><button className="btn-primary !px-4 !py-2 text-xs" onClick={()=>void loadAdaptive()}><RotateCcw size={13}/> تمرین بعدی</button></div>:<p className="mt-4 flex items-center gap-2 text-[11px] text-ink-500"><Headphones size={13}/> قبل از انتخاب، با هدفون گوش بده.</p>}
      </>}
    </div>
  </section>;
}
