"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ArrowLeft, Music2, Play } from "lucide-react";

const roots=["C","D","E","F","G","A","B"];
const intervals=[["Minor 2nd",1],["Major 2nd",2],["Minor 3rd",3],["Major 3rd",4],["Perfect 4th",5],["Tritone",6],["Perfect 5th",7],["Major 6th",9],["Minor 7th",10],["Octave",12]] as const;
const chords=[["Major",[0,4,7]],["Minor",[0,3,7]],["Diminished",[0,3,6]],["Augmented",[0,4,8]],["Sus4",[0,5,7]]] as const;
const freq=(m:number)=>440*Math.pow(2,(m-69)/12);
function tone(m:number,d=.7){if(typeof window==="undefined")return;const A=window.AudioContext||(window as any).webkitAudioContext;if(!A)return;const c=new A(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq(m);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.12,c.currentTime+.03);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d+.04);setTimeout(()=>void c.close(),(d+.2)*1000)}
function seeded(seed:number){const x=Math.sin(seed*12.9898)*43758.5453;return x-Math.floor(x)}
function shuffled<T>(items: readonly T[], seed:number){return [...items].sort((a,b)=>seeded(seed+String(a).length*17)-seeded(seed+String(b).length*17))}

export function TheoryLab({onBack}:{onBack:()=>void}){
 const { user } = useAuth();
 const [mode,setMode]=useState<"interval"|"chord">("interval"); const [root,setRoot]=useState("C"); const [answer,setAnswer]=useState<string|null>(null); const [round,setRound]=useState(0);
 const seed=useMemo(()=>Math.floor(Date.now()/86400000)+round*7919+(mode==="chord"?313:97),[mode,round]);
 const target=useMemo(()=>{const pool=mode==="interval"?intervals:chords;return pool[Math.floor(seeded(seed)*pool.length)];},[mode,seed]);
 const options=useMemo(()=>shuffled(mode==="interval"?intervals.map(x=>x[0]):chords.map(x=>x[0]),seed+41),[mode,seed]);
 const play=()=>{const base=60+roots.indexOf(root);if(mode==="interval"){tone(base);setTimeout(()=>tone(base+(target[1] as number)),220)}else (target[1] as readonly number[]).forEach((n,i)=>setTimeout(()=>tone(base+n,.8),i*140))};
 const correct=answer===String(target[0]);
 const submit=(value:string)=>{setAnswer(value);if(user?.id&&user.username)void fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user.id,username:user.username,fullName:user.fullName,gameId:`theory-${mode}`,score:value===String(target[0])?25:-5,accuracy:value===String(target[0])?100:0,streak:value===String(target[0])?1:0,bestScore:value===String(target[0])?25:0,metadata:{round,root,randomized:true}})}).catch(()=>{})};
 const next=()=>{setAnswer(null);setRound(v=>v+1)};
 return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}><ArrowLeft size={14}/> بازگشت</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><Music2 className="mx-auto text-violet-300" size={35}/><p className="eyebrow mt-5">THEORY LAB · RANDOMIZED EAR TRAINING</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">گوش موسیقیایی را از پایه تا حرفه‌ای بساز.</h1><p className="mt-3 text-sm leading-8 text-ink-400">هر دور یک فاصله یا آکورد تصادفی انتخاب می‌شود؛ ترتیب ثابت و تکرار پشت‌سرهم نداریم.</p><div className="mt-6 flex justify-center gap-2"><button className={`rounded-xl px-4 py-2 text-xs ${mode==="interval"?"bg-violet-400/15 text-violet-200":"bg-white/[.04] text-ink-500"}`} onClick={()=>{setMode("interval");setAnswer(null);setRound(v=>v+1)}}>Intervals</button><button className={`rounded-xl px-4 py-2 text-xs ${mode==="chord"?"bg-violet-400/15 text-violet-200":"bg-white/[.04] text-ink-500"}`} onClick={()=>{setMode("chord");setAnswer(null);setRound(v=>v+1)}}>Chords</button></div><div className="mt-5 flex items-center justify-center gap-2"><select className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm" value={root} onChange={e=>setRoot(e.target.value)}>{roots.map(r=><option key={r}>{r}</option>)}</select><button className="btn-primary !px-5 !py-2" onClick={play}><Play size={15} fill="currentColor"/> پخش تمرین تصادفی</button></div><div className="mt-6 grid gap-2 sm:grid-cols-2">{options.map(o=><button key={o} disabled={!!answer} onClick={()=>submit(o)} className={`rounded-xl border p-3 text-sm ${answer?o===String(target[0])?"border-emerald-400/40 bg-emerald-400/10 text-emerald-200":o===answer?"border-red-400/40 text-red-200":"border-white/10 text-ink-500":"border-white/10 text-ink-300 hover:border-violet-400/40"}`}>{o}</button>)}</div>{answer?<p className={`mt-5 text-sm ${correct?"text-emerald-200":"text-red-200"}`}>{correct?"درست! +25 امتیاز":"نادرست! 5- امتیاز · پاسخ درست: "+String(target[0])}</p>:null}<button className="btn-primary mt-6" onClick={next}>تمرین تصادفی بعدی</button></div></div></section>
}
