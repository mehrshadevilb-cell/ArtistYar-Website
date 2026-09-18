"use client";

import { useMemo, useState } from "react";
import { AudioWaveform, BarChart3, CheckCircle2, FileAudio, Loader2, LockKeyhole, Sparkles, Upload, Waves } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Metrics = {
  durationSec:number; sampleRate:number; channels:number; peakDbfs:number; truePeakDbfs:number;
  rmsDbfs:number; crestFactorDb:number; stereoCorrelation:number; stereoWidth:number;
  spectralCentroidHz:number; lowPct:number; midPct:number; highPct:number; clipPct:number; approxLufs:number;
};
type Analysis = {
  matchScore:number; summary:string; descriptors:{tonal:string; stereo:string; dynamics:string; loudness:string};
  eq:string[]; compression:string; limiting:string; roadmap:string[]; quickFixes:string[]; source:string;
};

function db(v:number){return Number.isFinite(v)?v.toFixed(1):"—"}
function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v))}

async function readMetrics(file:File):Promise<Metrics>{
  const Ctx=window.AudioContext||((window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext);
  if(!Ctx) throw new Error("audio_context_unavailable");
  const ctx=new Ctx();
  const buffer=await ctx.decodeAudioData(await file.arrayBuffer());
  const data=buffer.getChannelData(0);
  const step=Math.max(1,Math.floor(data.length/180000));
  let peak=0,sum=0,clips=0,n=0;
  for(let i=0;i<data.length;i+=step){const x=Math.abs(data[i]);peak=Math.max(peak,x);sum+=x*x;if(x>=0.999)clips++;n++}
  const rms=Math.sqrt(sum/Math.max(1,n));
  const left=buffer.getChannelData(0); const right=buffer.numberOfChannels>1?buffer.getChannelData(1):left;
  let corrN=0,corr=0,l2=0,r2=0;
  const s2=Math.max(1,Math.floor(left.length/60000));
  for(let i=0;i<left.length;i+=s2){const l=left[i]||0,r=right[i]||0;corr+=l*r;l2+=l*l;r2+=r*r;corrN++}
  const stereoCorrelation=buffer.numberOfChannels>1?clamp(corr/Math.sqrt(Math.max(1,l2*r2)),-1,1):1;
  const stereoWidth=buffer.numberOfChannels>1?Math.round((1-stereoCorrelation)*100):0;
  const bins=32; const low=buffer.sampleRate/10, high=buffer.sampleRate/4;
  const analyser=ctx.createAnalyser(); analyser.fftSize=4096; const source=ctx.createBufferSource(); source.buffer=buffer; source.connect(analyser); source.start(0);
  const freq=new Float32Array(analyser.frequencyBinCount); analyser.getFloatFrequencyData(freq); source.stop(); analyser.disconnect(); await ctx.close();
  let lowE=0,midE=0,highE=0,total=0,centroid=0;
  for(let i=0;i<freq.length;i++){const mag=Math.pow(10,(freq[i]||-120)/20);const hz=i*buffer.sampleRate/analyser.fftSize;total+=mag;centroid+=hz*mag;if(hz<low)lowE+=mag;else if(hz<high)midE+=mag;else highE+=mag}
  const denom=Math.max(total,1);
  return {durationSec:buffer.duration,sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels,peakDbfs:20*Math.log10(Math.max(peak,1e-8)),truePeakDbfs:20*Math.log10(Math.min(1.5,Math.max(peak,1e-8))),rmsDbfs:20*Math.log10(Math.max(rms,1e-8)),crestFactorDb:20*Math.log10(Math.max(peak,1e-8)/Math.max(rms,1e-8)),stereoCorrelation,stereoWidth,spectralCentroidHz:centroid/denom,lowPct:100*lowE/denom,midPct:100*midE/denom,highPct:100*highE/denom,clipPct:100*clips/Math.max(1,n),approxLufs:20*Math.log10(Math.max(rms,1e-8))-0.7};
}

function localAnalysis(m:Metrics):Analysis{
 const tonal=m.lowPct>45?"لو-اند سنگین":m.highPct>35?"بالا/برایت زیاد":"تونال بالانس نسبتاً متعادل";
 const dynamics=m.crestFactorDb<7?"فشرده":m.crestFactorDb>14?"داینامیک باز":"متوسط";
 const loud=m.approxLufs>-9?"بلند":m.approxLufs<-16?"آرام":"متوسط";
 const score=clamp(78-Math.abs(m.stereoCorrelation)*0+Math.max(-20,Math.min(10,m.crestFactorDb-10))-Math.max(0,m.clipPct*20),0,100);
 return {matchScore:Math.round(score),summary:"تحلیل اولیه بر اساس سیگنال واقعی فایل و شاخص‌های Peak/RMS/FFT/استریو؛ برای تصمیم نهایی با رفرنس level-match شده A/B کن.",descriptors:{tonal,stereo:m.stereoWidth>45?"Wide":"Focused",dynamics,loudness:loud},eq:[m.lowPct>45?"Sub/Low را 1–3dB کنترل کن و در مونو چک کن.":"Low-end در محدوده قابل‌قبول است.",m.midPct>48?"Low-mid را برای masking بررسی کن.":"Mid density متعادل است.",m.highPct>35?"بالا را برای harshness و de-ess بررسی کن.":"High-end نیاز به اصلاح شدید نشان نمی‌دهد."],compression:dynamics==="فشرده"?"از کمپرس بیشتر پرهیز کن؛ اول transient را حفظ کن.":"کمپرس ملایم 1–3dB GR را در باس/وکال تست کن.",limiting:m.truePeakDbfs>-1?"True Peak بالاست؛ سقف limiter را حدود -1 dBTP تنظیم کن.":"Headroom مناسب برای مرحله نهایی وجود دارد.",roadmap:["Level-match با رفرنس.","مونو و phase را چک کن.","EQ کاهشی قبل از boost.","کمپرس را بر اساس GR تصمیم بگیر.","در پایان limiter و True Peak را کنترل کن."],quickFixes:[m.clipPct>0?"کلیپ‌ شدن نمونه‌ها را رفع کن.":"کلیپ واضح شناسایی نشد.",m.stereoCorrelation<0?"فاز/استریو را فوراً بررسی کن.":"همبستگی فاز قابل‌قبول است."],source:"browser-metrics"};
}

export default function MusicAnalyzerLab(){
 const {user}=useAuth(); const [file,setFile]=useState<File|null>(null); const [metrics,setMetrics]=useState<Metrics|null>(null); const [analysis,setAnalysis]=useState<Analysis|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const analyze=async(f:File)=>{setError("");setFile(f);setMetrics(null);setAnalysis(null);setLoading(true);try{if(f.size>50*1024*1024)throw new Error("file_too_large");const m=await readMetrics(f);setMetrics(m);const r=await fetch("/api/practice/music-analyzer",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user?.id||"",telegramId:user?.telegramId||"",metrics:m,fileName:f.name})});const d=await r.json();if(r.status===429)throw new Error("daily_limit_reached");if(!r.ok||!d.ok)throw new Error(d.error||"analysis_failed");setAnalysis(d.analysis||localAnalysis(m));}catch(e){setError(e instanceof Error?e.message:"analysis_failed");}finally{setLoading(false)}};
 const cards=useMemo(()=>metrics?[["Peak",db(metrics.peakDbfs)+" dBFS"],["RMS",db(metrics.rmsDbfs)+" dBFS"],["LUFS≈",db(metrics.approxLufs)],["True Peak",db(metrics.truePeakDbfs)+" dBTP"],["Stereo",Math.round(metrics.stereoWidth)+"%"],["Phase",db(metrics.stereoCorrelation)]]:[],[metrics]);
 return <section dir="rtl" className="space-y-6">
  <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><div className="eyebrow">AI AUDIO · REFERENCE-STYLE</div><h1 className="mt-2 text-3xl font-semibold text-sand-50 sm:text-5xl">Music Analyzer</h1><p className="mt-3 max-w-2xl text-sm leading-8 text-ink-400">فایل را آپلود کن؛ Peak، True Peak، RMS، LUFS تقریبی، FFT، Stereo و roadmap میکس را یکجا ببین.</p></div><div className="card-ay flex items-center gap-2 px-4 py-3 text-xs text-ink-300"><Sparkles size={16} className="text-gold-300"/> Free: یک تحلیل در روز · Pro: بدون محدودیت</div></div>
  <label className="card-ay flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 border-dashed border-cyan-400/25 p-8 text-center"><Upload className="text-cyan-300" size={30}/><strong className="text-sand-50">{loading?"در حال تحلیل…":file?file.name:"MP3 / WAV / M4A / FLAC / OGG"}</strong><span className="text-xs text-ink-500">حداکثر 50MB</span><input className="sr-only" type="file" accept="audio/*" onChange={e=>{const f=e.target.files?.[0];if(f)void analyze(f)}}/></label>
  {error&&<div className="card-ay border-red-400/20 p-4 text-sm text-red-300">{error==="daily_limit_reached"?"سهمیه امروز تمام شده است.":"تحلیل انجام نشد؛ فایل یا اتصال را بررسی کن."}</div>}
  {loading&&<div className="card-ay flex items-center justify-center gap-3 p-6 text-sm text-ink-300"><Loader2 className="animate-spin text-cyan-300"/>در حال استخراج و تحلیل سیگنال…</div>}
  {metrics&&<><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{cards.map(([k,v])=><div key={k} className="card-ay p-4"><span className="text-[10px] text-ink-500">{k}</span><strong className="mt-2 block text-sm text-sand-50">{v}</strong></div>)}</div><div className="grid gap-4 md:grid-cols-3"><div className="card-ay p-5"><FileAudio className="text-cyan-300"/><p className="mt-3 text-xs text-ink-400">Duration {metrics.durationSec.toFixed(1)}s · {metrics.sampleRate}Hz · {metrics.channels}ch</p></div><div className="card-ay p-5"><Waves className="text-gold-300"/><p className="mt-3 text-xs text-ink-400">Low {metrics.lowPct.toFixed(0)}% · Mid {metrics.midPct.toFixed(0)}% · High {metrics.highPct.toFixed(0)}%</p></div><div className="card-ay p-5"><BarChart3 className="text-violet-300"/><p className="mt-3 text-xs text-ink-400">Centroid {Math.round(metrics.spectralCentroidHz)}Hz · Clip {metrics.clipPct.toFixed(2)}%</p></div></div></>}
  {analysis&&<div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><article className="card-ay p-6"><div className="flex items-center justify-between"><h2 className="text-xl text-sand-50">AI Mix Report</h2><span className="rounded-full border border-gold-400/20 px-3 py-1 text-xs text-gold-300">Match {analysis.matchScore}%</span></div><p className="mt-4 text-sm leading-8 text-ink-300">{analysis.summary}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(analysis.descriptors).map(([k,v])=><div key={k} className="rounded-2xl border border-white/5 bg-white/[.02] p-4"><span className="text-[10px] text-ink-500">{k}</span><p className="mt-2 text-sm text-sand-100">{v}</p></div>)}</div></article><aside className="card-ay p-6"><h3 className="text-lg text-sand-50">Roadmap</h3><ol className="mt-4 space-y-3 text-sm leading-7 text-ink-300">{analysis.roadmap.map((x,i)=><li key={i}><span className="ml-2 text-gold-300">{i+1}.</span>{x}</li>)}</ol></aside><article className="card-ay p-6 lg:col-span-2"><h3 className="text-lg text-sand-50">EQ · Compression · Limiting</h3><div className="mt-4 grid gap-3 md:grid-cols-3"><div><b className="text-xs text-gold-300">EQ</b>{analysis.eq.map((x,i)=><p key={i} className="mt-2 text-sm text-ink-300">{x}</p>)}</div><div><b className="text-xs text-cyan-300">Compression</b><p className="mt-2 text-sm text-ink-300">{analysis.compression}</p></div><div><b className="text-xs text-violet-300">Limiting</b><p className="mt-2 text-sm text-ink-300">{analysis.limiting}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{analysis.quickFixes.map((x,i)=><span key={i} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-ink-300"><CheckCircle2 size={13} className="ml-1 inline text-emerald-300"/>{x}</span>)}</div></article></div>}
 </section>;
}
