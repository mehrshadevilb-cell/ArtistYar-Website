"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Play, RotateCcw } from "lucide-react";
import { startLiveTone, setLiveToneHz, stopLiveTone } from "@/lib/practice-audio-engine";
import { formatHz } from "@/lib/practice-game";
import "@/styles/practice-shell.css";

function clamp(v:number,a=0,b=1){return Math.max(a,Math.min(b,v));}
function toLog(hz:number,min:number,max:number){const lo=Math.max(20,min),hi=Math.max(lo+1,max);return clamp((Math.log(clamp(hz,lo,hi))-Math.log(lo))/(Math.log(hi)-Math.log(lo)));}
function fromLog(t:number,min:number,max:number){const lo=Math.max(20,min),hi=Math.max(lo+1,max);return Math.round(Math.exp(Math.log(lo)+clamp(t)*(Math.log(hi)-Math.log(lo))));}

export type FreqDialMode="listen"|"remember"|"recreate";
type Props={
 minHz:number; maxHz:number; valueHz:number; waveHz:number; mode:FreqDialMode;
 playing?:boolean; disabled?:boolean; targetHz?:number|null; revealTarget?:boolean;
 audioError?:string|null; onChangeHz:(hz:number)=>void; onLock?:()=>void; onReplay?:()=>void;
 showReplay?:boolean; replayLabel?:string;
};

export function FrequencyMemoryDial({
 minHz,maxHz,valueHz,waveHz,mode,playing=false,disabled=false,targetHz=null,revealTarget=false,
 audioError=null,onChangeHz,onLock,onReplay,showReplay=false,replayLabel="پخش دوباره"
}:Props){
 const surfaceRef=useRef<HTMLDivElement>(null);
 const dragRef=useRef({active:false,moved:false,lastX:0,lastY:0,lastT:0,angle:0});
 const velocityRef=useRef(0);
 const [velocity,setVelocity]=useState(0);
 const [pressure,setPressure]=useState(0);
 const [phase,setPhase]=useState(0);
 const [reducedMotion,setReducedMotion]=useState(false);
 const rafRef=useRef<number|null>(null);
 const gradientId=`fm-${useId().replace(/:/g,"")}`;
 const interactive=mode==="recreate"&&!disabled;

 useEffect(()=>{const mq=window.matchMedia("(prefers-reduced-motion: reduce)");const apply=()=>setReducedMotion(mq.matches);apply();mq.addEventListener?.("change",apply);return()=>mq.removeEventListener?.("change",apply);},[]);
 useEffect(()=>{
   if(reducedMotion)return;
   let last=performance.now();
   const tick=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;velocityRef.current*=.91;setVelocity(velocityRef.current);setPhase(p=>p+dt*(playing?2.6:1));setPressure(p=>Math.max(0,p*.94));rafRef.current=requestAnimationFrame(tick);};
   rafRef.current=requestAnimationFrame(tick); return()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);};
 },[playing,reducedMotion]);
 useEffect(()=>()=>{stopLiveTone();if(rafRef.current)cancelAnimationFrame(rafRef.current);},[]);

 const setFromPoint=useCallback((x:number,y:number,withTone=true)=>{
   const el=surfaceRef.current;if(!el)return;
   const r=el.getBoundingClientRect();
   const nx=clamp((x-r.left)/Math.max(1,r.width));
   const ny=clamp((y-r.top)/Math.max(1,r.height));
   const d=dragRef.current;const now=performance.now();const dt=Math.max(8,now-d.lastT);
   const dx=x-d.lastX,dy=y-d.lastY;
   const speed=Math.min(3,Math.hypot(dx,dy)/dt*8); velocityRef.current=speed;setVelocity(speed);
   const angle=Math.atan2(y-r.top-(r.height/2),x-r.left-(r.width/2));
   const angleDelta=Math.atan2(Math.sin(angle-d.angle),Math.cos(angle-d.angle));
   const circular=Math.abs(dx)>1&&Math.abs(dy)>1;
   const circularBoost=circular?angleDelta*.018:0;
   const verticalFine=(.5-ny)*.035;
   const t=clamp(nx+circularBoost+verticalFine);
   const hz=fromLog(t,minHz,maxHz);
   d.lastX=x;d.lastY=y;d.lastT=now;d.angle=angle;d.moved=d.moved||Math.hypot(dx,dy)>4;
   onChangeHz(hz);setPressure(Math.min(1,.18+speed*.22+Math.abs(.5-ny)*.8));
   if(withTone){void startLiveTone(hz);setLiveToneHz(hz);}
 },[minHz,maxHz,onChangeHz]);

 const down=(e:ReactPointerEvent<HTMLDivElement>)=>{
   if(!interactive)return;
   const r=surfaceRef.current?.getBoundingClientRect();if(!r)return;
   e.currentTarget.setPointerCapture(e.pointerId);
   const d=dragRef.current;d.active=true;d.moved=false;d.lastX=e.clientX;d.lastY=e.clientY;d.lastT=performance.now();d.angle=Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2);
   setPressure(.8);setFromPoint(e.clientX,e.clientY);
 };
 const move=(e:ReactPointerEvent<HTMLDivElement>)=>{if(dragRef.current.active)setFromPoint(e.clientX,e.clientY);};
 const up=(e:ReactPointerEvent<HTMLDivElement>)=>{
   const d=dragRef.current;if(!d.active)return;d.active=false;setPressure(.35);
   try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
   if(!d.moved&&interactive){void startLiveTone(valueHz);setLiveToneHz(valueHz);}
 };
 const key=(e:ReactKeyboardEvent<HTMLDivElement>)=>{
   if(!interactive)return;const step=e.shiftKey?12:3;let hz=valueHz;
   if(e.key==="ArrowLeft"||e.key==="ArrowDown")hz=fromLog(toLog(valueHz,minHz,maxHz)-step/100,minHz,maxHz);
   else if(e.key==="ArrowRight"||e.key==="ArrowUp")hz=fromLog(toLog(valueHz,minHz,maxHz)+step/100,minHz,maxHz);
   else if(e.key==="Enter"||e.key===" "){e.preventDefault();stopLiveTone();onLock?.();return;}else return;
   e.preventDefault();onChangeHz(hz);void startLiveTone(hz);setLiveToneHz(hz);
 };

 const makePaths=(hz:number,offset=0)=>{
   const t=toLog(hz,Math.min(minHz,40),Math.max(maxHz,4000));const cycles=1.4+t*5;
   const amp=11+Math.min(8,velocity*2.2)+pressure*5;const pts:string[]=[];const n=reducedMotion?32:64;
   for(let i=0;i<=n;i++){const y=i/n*200;const x=50+Math.sin(i/n*cycles*Math.PI*2+phase*(1+offset*.04)+offset)*amp*(1-offset*.08);pts.push(`${i?"L":"M"} ${x.toFixed(2)} ${y.toFixed(2)}`);}return pts.join(" ");
 };
 const paths=useMemo(()=>Array.from({length:5},(_,i)=>makePaths(Math.max(40,waveHz||valueHz),i)),[waveHz,valueHz,velocity,pressure,phase,reducedMotion]);
 const targetPath=targetHz&&revealTarget?makePaths(targetHz,7):null;
 const modeLabel=mode==="listen"?"گوش بده":mode==="remember"?"به‌خاطر بسپار":"بازسازی کن";

 return <div className={`fm-dial ${playing?"is-playing":""} ${pressure>.5?"is-pressed":""}`}>
   <p className="fm-dial-mode" aria-live="polite">{modeLabel}</p>
   <div ref={surfaceRef} className={`fm-dial-surface ${interactive?"is-interactive":""} ${mode==="remember"?"is-locked":""} ${audioError?"has-error":""}`}
     role="slider" tabIndex={interactive?0:-1} aria-valuemin={minHz} aria-valuemax={maxHz} aria-valuenow={valueHz}
     aria-valuetext={formatHz(valueHz)} aria-label="تنظیم فرکانس با کشیدن موج" aria-disabled={!interactive}
     onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
     <div className="fm-wave-ambient" aria-hidden />
     <svg viewBox="0 0 100 200" className="fm-wave" aria-hidden>
       <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5eead4"/><stop offset="48%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#d4af37"/></linearGradient></defs>
       {targetPath&&<path d={targetPath} fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.1" strokeDasharray="2 4" className="fm-target-wave"/>}
       {paths.map((d,i)=><path key={i} d={d} fill="none" stroke={`url(#${gradientId})`} strokeWidth={1.05+i*.2} opacity={.22+i*.13} strokeLinecap="round"/>)}
     </svg>
     <div className="fm-hz-readout">
       <p className="fm-hz-label">{mode==="recreate"?"GUESS":mode==="listen"?"TARGET":"•••"}</p>
       <p className="fm-hz-value">{mode==="remember"?"•••":formatHz(mode==="listen"?waveHz:valueHz)}</p>
       {interactive&&<p className="fm-gesture-hint">بکش · نگه‌دار · کوک کن</p>}
     </div>
     {audioError&&<div className="fm-inline-error" role="status">{audioError}</div>}
     <input type="range" className="fm-range-sr" min={0} max={1000} step={1} value={Math.round(toLog(valueHz,minHz,maxHz)*1000)}
       disabled={!interactive} aria-label="اسلایدر فرکانس" onChange={e=>{const hz=fromLog(+e.target.value/1000,minHz,maxHz);onChangeHz(hz);void startLiveTone(hz);setLiveToneHz(hz);}}/>
   </div>
   <div className="fm-dial-actions">
     {showReplay&&onReplay&&<button type="button" className="btn-ay inline-flex items-center gap-2" onClick={onReplay} disabled={playing}><Play size={16}/>{playing?"در حال پخش…":replayLabel}</button>}
     {mode==="recreate"&&onLock&&<button type="button" className="btn-ay btn-ay-primary flex-1" onClick={()=>{stopLiveTone();onLock();}}>قفل پاسخ</button>}
     {mode==="recreate"&&<button type="button" className="btn-ay" onClick={()=>{void startLiveTone(valueHz);setLiveToneHz(valueHz);}}><Play size={15}/> پخش حدس</button>}
     {revealTarget&&targetHz&&<button type="button" className="btn-ay" onClick={()=>{onChangeHz(targetHz);void startLiveTone(targetHz);setLiveToneHz(targetHz);}}><RotateCcw size={15}/> شنیدن هدف</button>}
   </div>
 </div>;
}
