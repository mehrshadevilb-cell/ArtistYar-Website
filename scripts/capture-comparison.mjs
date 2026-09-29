#!/usr/bin/env node
/**
 * Frequency Memory reference-vs-production capture harness.
 *
 * Usage on a machine/CI runner with outbound HTTPS:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *   node scripts/capture-comparison.mjs
 *
 * Optional: CAPTURE_RUNS=2 CAPTURE_HEADLESS=0 node scripts/capture-comparison.mjs
 *
 * Output: capture/<site>-<viewport>-runN/ containing Playwright video,
 * trace.zip, DOM/CSS/JS snapshot JSON+HTML, and phase screenshots.
 * capture/pairs/<viewport>/<phase>/ contains run-1 reference/production
 * screenshot pairs. No mocked/reference data is substituted.
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("capture");
const SITES = {
  dialed: "https://dialed.gg/sound",
  ours: "https://artistyar-website-iis2.onrender.com/practice",
};
const VIEWPORTS = {
  desktop: { width: 1440, height: 1000, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const PHASES = ["intro","listen","tuning","result","ready-set-go","final-results"];
const RUNS = Number(process.env.CAPTURE_RUNS || 2);
const HEADLESS = process.env.CAPTURE_HEADLESS !== "0";
const ONLY = process.env.CAPTURE_ONLY || "both";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[^a-z0-9_-]+/gi, "-");

async function runPreflight(browser, url) {
  const p = await browser.newPage();
  try {
    const r = await p.goto(url, { waitUntil:"domcontentloaded", timeout:30000 });
    return { ok:!!r?.ok(), status:r?.status() ?? null, finalURL:p.url(), error:null };
  } catch (e) {
    return { ok:false, status:null, finalURL:p.url(), error:String(e?.stack || e) };
  } finally { await p.close(); }
}

async function instrument(p) {
  await p.addInitScript(() => {
    window.__fmCapture = { marks:[], audio:[], errors:[] };
    window.__fmMark = (name, detail={}) =>
      window.__fmCapture.marks.push({name, t:performance.now(), detail});
    addEventListener("error", e => window.__fmCapture.errors.push({
      type:"error", message:e.message, source:e.filename, line:e.lineno
    }));
    addEventListener("unhandledrejection", e =>
      window.__fmCapture.errors.push({type:"unhandledrejection", message:String(e.reason)}));
    for (const key of ["AudioContext","webkitAudioContext"]) {
      const Original = window[key]; if (!Original) continue;
      const Wrapped = function(...args) {
        const ctx = new Original(...args);
        window.__fmCapture.audio.push({kind:"context",sampleRate:ctx.sampleRate,state:ctx.state,t:performance.now()});
        const co = ctx.createOscillator.bind(ctx), cg = ctx.createGain.bind(ctx);
        ctx.createOscillator = (...a) => {
          const o = co(...a);
          window.__fmCapture.audio.push({kind:"oscillator",type:o.type,frequency:o.frequency?.value,t:performance.now()});
          return o;
        };
        ctx.createGain = (...a) => {
          const g = cg(...a);
          window.__fmCapture.audio.push({kind:"gain",value:g.gain?.value,t:performance.now()});
          return g;
        };
        return ctx;
      };
      Wrapped.prototype = Original.prototype; window[key] = Wrapped;
    }
  });
}

async function snapshot(p, dir, label) {
  await fs.writeFile(path.join(dir, label+".html"), await p.content());
  const data = await p.evaluate(() => {
    const els=[...document.querySelectorAll("*")].slice(0,3000);
    const styles=els.map((e,i)=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();
      return {i,tag:e.tagName,id:e.id,cls:typeof e.className==="string"?e.className:"",
        text:(e.textContent||"").trim().slice(0,300),rect:{x:r.x,y:r.y,w:r.width,h:r.height},
        style:Object.fromEntries(["display","position","fontFamily","fontSize","fontWeight",
          "fontVariantNumeric","letterSpacing","lineHeight","color","backgroundColor",
          "borderRadius","boxShadow","opacity","filter","transform"].map(k=>[k,s[k]]))};});
    return {url:location.href,title:document.title,styles,
      canvases:[...document.querySelectorAll("canvas")].map((c,i)=>({i,w:c.width,h:c.height,rect:c.getBoundingClientRect().toJSON()})),
      scripts:[...document.scripts].map(s=>({src:s.src,type:s.type,inline:s.src?null:s.textContent?.slice(0,3000)})),
      stylesheets:[...document.querySelectorAll('link[rel="stylesheet"]')].map(x=>x.href),
      capture:window.__fmCapture};
  });
  await fs.writeFile(path.join(dir,label+".json"),JSON.stringify(data,null,2));
  await p.screenshot({path:path.join(dir,label+".png"),fullPage:false});
}

async function clickText(p, re) {
  const l=p.getByText(re,{exact:false}).first();
  if(await l.count().catch(()=>0)) { try { await l.click({timeout:1500}); return true; } catch {} }
  return false;
}

async function start(p) {
  for (const re of [/start/i,/begin/i,/play/i,/شروع/i]) if(await clickText(p,re)) break;
  await sleep(500);
}

async function dial(p) {
  const el=p.locator('[role="slider"]').first();
  const canvas=p.locator("canvas").first();
  const target=await el.count().catch(()=>0) ? el : canvas;
  if(!await target.count().catch(()=>0)) return false;
  const b=await target.boundingBox(); if(!b) return false;
  const x=b.x+b.width/2;
  await p.mouse.move(x,b.y+b.height*.58); await p.mouse.down();
  for(const y of [.30,.72,.46,.62]) await p.mouse.move(x,b.y+b.height*y,{steps:18});
  await p.mouse.up(); return true;
}

async function submit(p) {
  for(const re of [/submit/i,/lock/i,/answer/i,/ثبت/i]) {
    const b=p.getByRole("button",{name:re}).first();
    if(await b.count().catch(()=>0)) { try { await b.click({timeout:1500}); return true; } catch {} }
  }
  await p.keyboard.press("Enter").catch(()=>{}); return false;
}

async function phase(p,dir,name,round) {
  await p.evaluate(({name,round}) => window.__fmMark?.(name,{round}),{name,round});
  await snapshot(p,dir,esc(String(round).padStart(2,"0")+"-"+name));
}

async function runGame(site, viewportName, runNo) {
  const vp=VIEWPORTS[viewportName], dir=path.join(OUT,site+"-"+viewportName+"-run"+runNo);
  await fs.mkdir(dir,{recursive:true});
  const browser=await chromium.launch({headless:HEADLESS});
  const ctx=await browser.newContext({viewport:vp,recordVideo:{dir,size:{width:vp.width,height:vp.height}},reducedMotion:"no-preference"});
  await ctx.tracing.start({screenshots:true,snapshots:true,sources:true});
  const p=await ctx.newPage(); await instrument(p);
  try {
    await p.goto(SITES[site],{waitUntil:"networkidle",timeout:60000}); await sleep(800);
    await phase(p,dir,"intro",0); await start(p);
    for(let r=1;r<=5;r++){
      if(r>1){ await phase(p,dir,"ready-set-go",r); await sleep(1900); }
      await phase(p,dir,"listen",r); await sleep(1800);
      await phase(p,dir,"tuning",r); await dial(p); await sleep(800);
      await submit(p); await sleep(250); await phase(p,dir,"result",r); await sleep(3000);
    }
    await phase(p,dir,"final-results",5);
    await fs.writeFile(path.join(dir,"manifest.json"),JSON.stringify({
      site,viewport:vp,run:runNo,url:SITES[site],
      capture:await p.evaluate(()=>window.__fmCapture),capturedAt:new Date().toISOString()
    },null,2));
  } catch(e) {
    await fs.writeFile(path.join(dir,"ERROR.txt"),String(e?.stack||e));
  } finally {
    const video=p.video();
    await ctx.tracing.stop({path:path.join(dir,"trace.zip")}).catch(()=>{});
    await ctx.close(); await video?.path().catch(()=>{}); await browser.close();
  }
}

await fs.mkdir(OUT,{recursive:true});
const pb=await chromium.launch({headless:true}), preflight={};
for(const [k,u] of Object.entries(SITES)) preflight[k]=await runPreflight(pb,u);
await pb.close();
await fs.writeFile(path.join(OUT,"preflight.json"),JSON.stringify(preflight,null,2));
console.log(JSON.stringify(preflight,null,2));
if(!Object.values(preflight).every(x=>x.ok)) {
  console.error("Preflight failed; no capture was fabricated.");
  process.exit(2);
}
for(const site of Object.keys(SITES)) if(ONLY==="both"||ONLY===site)
  for(const vp of Object.keys(VIEWPORTS)) for(let n=1;n<=RUNS;n++) await runGame(site,vp,n);

for(const vp of Object.keys(VIEWPORTS)) for(const ph of PHASES) {
  const d=path.join(OUT,"pairs",vp,ph); await fs.mkdir(d,{recursive:true});
  for(const site of ["dialed","ours"]) {
    const src=path.join(OUT,site+"-"+vp+"-run1",`01-${ph}.png`);
    try { await fs.copyFile(src,path.join(d,site+".png")); } catch {}
  }
}
console.log("Capture output:",OUT);
