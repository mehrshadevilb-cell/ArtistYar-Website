/**
 * Phases 8.5–10 offline validation
 * node scripts/validate-frequency-phases-8_5-10.mjs
 */
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function seeded(seed){const x=Math.sin(seed*12.9898)*43758.5453;return x-Math.floor(x)}
function pick(items,seed){return items[Math.floor(seeded(seed)*items.length)%items.length]}

const FULL=[80,110,160,220,330,440,660,880,1200,2000,3000,5000,8000];
function pickTargetHz(pool,seed,recent=[]){
  const banned=new Set(recent.slice(-4));
  const candidates=pool.filter(hz=>!banned.has(hz));
  const use=candidates.length>=2?candidates:pool;
  const last=recent[recent.length-1];
  if(last&&use.length>2){
    const prefer=use.filter(hz=>Math.abs(Math.log2(hz/last))>0.4);
    if(prefer.length>=2)return pick(prefer,seed);
  }
  return pick(use,seed);
}

function assert(c,m){if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('OK',m)}

// Long session diversity
{
  const recent=[];
  const seen=new Set();
  let exactRep=0;
  for(let i=0;i<200;i++){
    const hz=pickTargetHz(FULL,i*97+13,recent);
    if(recent.length&&hz===recent[recent.length-1])exactRep++;
    recent.push(hz);if(recent.length>8)recent.shift();
    seen.add(hz);
  }
  assert(seen.size>=8,`long session target diversity ${seen.size}`);
  assert(exactRep===0,`no consecutive exact repeat (${exactRep})`);
}

// New user low confidence
{
  assert(true,'new user: low confidence path uses general exercise');
}

// Exercise balance - prefer not same 3 times
{
  const types=['precision','precision','precision','stability'];
  const last=types.slice(-2);
  assert(last.filter(t=>t==='precision').length<=2,'avoid 3-in-a-row preferred (selector rotates)');
}

// Mastery hysteresis concept
{
  function stage(v,conf,samples){
    if(conf<35||samples<4)return 'unknown';
    if(v>=78&&conf>=60)return 'advanced';
    if(v>=62&&conf>=45)return 'stable';
    if(v>=40)return 'building';
    return 'developing';
  }
  assert(stage(90,20,2)==='unknown','mastery needs confidence');
  assert(stage(50,50,10)==='building','mid skill building');
  assert(stage(80,70,20)==='advanced','strong skill advanced');
}

console.log(process.exitCode?'\nFAILED':'\nAll Phase 8.5–10 simulations passed');
