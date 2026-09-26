/**
 * Phase 10.5 — long-session stability + authority + anti-pathology
 * node scripts/validate-frequency-phase10_5.mjs
 */
function clamp(n,a,b){return Math.max(a,Math.min(b,Number.isFinite(n)?n:a))}
function seeded(seed){const x=Math.sin(seed*12.9898)*43758.5453;return x-Math.floor(x)}
function pick(items,seed){return items[Math.floor(seeded(seed)*items.length)%items.length]}
function safeHz(n,fb=440){const v=Number(n);return Number.isFinite(v)&&v>0&&v<24000?v:fb}

const FULL=[80,110,160,220,330,440,660,880,1200,2000,3000,5000,8000];

function pickTargetHz(pool,seed,recent=[]){
  const base=(pool||[]).map(h=>safeHz(h,0)).filter(h=>h>0);
  const usePool=base.length?base:[440];
  const recentSafe=recent.map(h=>safeHz(h,0)).filter(h=>h>0).slice(-8);
  const banned=new Set(recentSafe.slice(-4));
  const candidates=usePool.filter(hz=>!banned.has(hz));
  const use=candidates.length>=2?candidates:usePool;
  const last=recentSafe[recentSafe.length-1];
  if(last&&use.length>2){
    const prefer=use.filter(hz=>{
      const ratio=hz/last;if(!(ratio>0))return true;
      return Math.abs(Math.log2(ratio))>0.4;
    });
    if(prefer.length>=2)return pick(prefer,seed);
  }
  if(recentSafe.length>=2&&use.length>2){
    const a=recentSafe[recentSafe.length-2];
    const b=recentSafe[recentSafe.length-1];
    if(a!==b){
      const anti=use.filter(hz=>hz!==a);
      if(anti.length>=2)return pick(anti,seed);
    }
  }
  return pick(use,seed);
}

function selectExercise(recentTypes,round,total,profileEnough){
  if(!profileEnough)return 'general';
  let preferred=['precision','stability','range','challenge','general'][Math.floor(seeded(round*17)*5)];
  const last3=recentTypes.slice(-3);
  if(last3.length>=2&&last3.every(t=>t===preferred)){
    preferred=['general','precision','stability','range','challenge'].find(t=>t!==preferred)||'general';
  }
  const last2=recentTypes.slice(-2);
  if(last2.includes(preferred)){
    const next=['general','precision','stability','range','challenge'].find(t=>!last2.includes(t));
    if(next)preferred=next;
  }
  return preferred;
}

function nextLevel(current,recent){
  const base=clamp(current,1,50);
  const window=recent.slice(-6).map(r=>({
    correct:!!r.correct,
    accuracy:clamp(r.accuracy,0,100),
    responseTimeMs:clamp(r.responseTimeMs,1,120000),
  }));
  if(!window.length)return base;
  const acc=window.reduce((s,r)=>s+r.accuracy,0)/window.length;
  const misses=window.filter(r=>!r.correct).length;
  const avgRt=window.reduce((s,r)=>s+r.responseTimeMs,0)/window.length;
  let delta=0;
  if(acc>=88&&misses===0)delta=avgRt<4500?2:1;
  else if(acc>=74)delta=1;
  else if(acc<45||misses>=3)delta=-2;
  else if(acc<62)delta=-1;
  delta=clamp(delta,-2,2);
  return clamp(base+delta,1,50);
}

function assert(c,m){if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('OK',m)}

function sim(rounds,label){
  const recent=[];
  const seen=new Set();
  let exactRep=0;
  let aba=0;
  const types=[];
  let type3=0;
  let level=12;
  const levels=[];
  const outcomes=[];
  for(let i=0;i<rounds;i++){
    const hz=pickTargetHz(FULL,i*97+13,recent);
    if(recent.length&&hz===recent[recent.length-1])exactRep++;
    if(recent.length>=2&&hz===recent[recent.length-2]&&recent[recent.length-1]!==hz)aba++;
    recent.push(hz);if(recent.length>8)recent.shift();
    seen.add(hz);
    const t=selectExercise(types,i,rounds,true);
    if(types.length>=2&&types.slice(-2).every(x=>x===t)&&t===types[types.length-1])type3++;
    types.push(t);if(types.length>12)types.shift();
    const acc=55+seeded(i*3)*40;
    const correct=acc>=70;
    outcomes.push({correct,accuracy:acc,responseTimeMs:2000+seeded(i)*3000});
    if(outcomes.length>24)outcomes.shift();
    level=nextLevel(level,outcomes);
    levels.push(level);
  }
  const minL=Math.min(...levels),maxL=Math.max(...levels);
  const jumps=levels.slice(1).filter((l,i)=>Math.abs(l-levels[i])>2).length;
  assert(exactRep===0,`${label}: no consecutive exact target (${exactRep})`);
  assert(seen.size>=8,`${label}: target diversity ${seen.size}`);
  assert(type3===0,`${label}: no 3-in-a-row exercise (${type3})`);
  assert(jumps===0,`${label}: no difficulty jump >2 (${jumps})`);
  assert(minL>=1&&maxL<=50,`${label}: level bounds ${minL}-${maxL}`);
  assert(aba<rounds*0.15,`${label}: ABA rate ${aba}/${rounds}`);
  assert(recent.length<=8,`${label}: recent targets bounded`);
  assert(types.length<=12,`${label}: exercise history bounded`);
  assert(outcomes.length<=24,`${label}: outcomes bounded`);
}

sim(100,'100 rounds');
sim(500,'500 rounds');
sim(1000,'1000 rounds');

{
  const bad=pickTargetHz([NaN,0,-5,440],1,[NaN,Infinity]);
  assert(Number.isFinite(bad)&&bad>0,`NaN pool yields finite Hz (${bad})`);
  const lv=nextLevel(NaN,[{correct:true,accuracy:NaN,responseTimeMs:Infinity}]);
  assert(lv>=1&&lv<=50,`NaN outcomes yield bounded level (${lv})`);
}

{
  const o=[{correct:true,accuracy:90,responseTimeMs:2000}];
  const a=nextLevel(10,o);
  const b=nextLevel(10,o);
  assert(a===b,'adaptive deterministic for same outcomes');
}

console.log(process.exitCode?'\nFAILED':'\nAll Phase 10.5 long-session simulations passed');
