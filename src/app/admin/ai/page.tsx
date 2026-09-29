"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Activity, Bot, Brain, Code2, GitBranch, Layers3, Loader2, MemoryStick, Paperclip, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Square, Zap, X } from "lucide-react";
import { withTimeout, isAbortError } from "@/lib/admin-ai-timeout";

type Mode = "chat" | "agent";
type Panel = "workspace" | "skills" | "connectors" | "memory" | "models" | "activity";
type Message = { role:"user"|"assistant"; content:string; provider?:string|null; model?:string|null };
type Conversation = { id:string; title:string; archived:boolean; created_at:string; updated_at:string; messages?:Message[] };
type ActivityItem = { id:string; at:string; kind:"info"|"tool"|"model"|"error"|"done"; message:string; detail?:string };
type Skill = { id:string; name:string; description:string; version:string; tools:string[]; enabled:boolean; source?:string };
type Connector = { id:string; name:string; status:string; hint?:string };
type Model = { id:string; provider_id?:string; model_id?:string; display_name?:string; enabled?:boolean; preferred?:boolean; priority?:number; status?:string };
type TraceEvent = { id:string; kind:string; message:string; detail?:string; at:string };

const NAV:[Panel,string,typeof Layers3][] = [
  ["workspace","Workspace",Layers3],["skills","Skills",Zap],["connectors","Connectors",GitBranch],
  ["memory","Memory",MemoryStick],["models","Models",Bot],["activity","Activity",Activity],
];

async function api(url:string, init?:RequestInit, timeout=30000){
  const parentSignal=init?.signal ?? undefined;
  const t=withTimeout(parentSignal,timeout);
  try{
    const res=await fetch(url,{credentials:"include",cache:"no-store",...init,signal:t.signal});
    const text=await res.text(); let json:any={}; try{json=text?JSON.parse(text):{}}catch{}
    if(res.status===401&&typeof window!=="undefined") window.location.assign("/login?next="+encodeURIComponent(location.pathname));
    if(!res.ok||json.ok===false) throw new Error(json.error||text.slice(0,240)||"Request failed");
    return json;
  }catch(e){
    if(isAbortError(e)) {
      if(parentSignal?.aborted) throw new Error("درخواست لغو شد.");
      if(t.didTimeout()) throw new Error("زمان درخواست تمام شد.");
    }
    throw e;
  }finally{t.clear()}
}

export default function AdminAiPage(){
  const [panel,setPanel]=useState<Panel>("workspace"),[mode,setMode]=useState<Mode>("agent");
  const [conversations,setConversations]=useState<Conversation[]>([]),[active,setActive]=useState<Conversation|null>(null);
  const [input,setInput]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [activity,setActivity]=useState<ActivityItem[]>([]),[skills,setSkills]=useState<Skill[]>([]);
  const [connectors,setConnectors]=useState<Connector[]>([]),[models,setModels]=useState<Model[]>([]);
  const [overview,setOverview]=useState<any>(null),[taskResult,setTaskResult]=useState<any>(null);
  const abortRef=useRef<AbortController|null>(null);

  const refresh=useCallback(async()=>{try{
    const [o,a]=await Promise.all([api("/api/admin/ai-platform?section=overview"),api("/api/admin/ai-platform?section=activity")]);
    setOverview(o.overview);setActivity(a.activity||[]);
  }catch{}},[]);
  const load=useCallback(async(p:Panel)=>{try{
    if(p==="skills")setSkills((await api("/api/admin/ai-platform?section=skills")).skills||[]);
    if(p==="connectors")setConnectors((await api("/api/admin/ai-platform?section=connectors")).connectors||[]);
    if(p==="models")setModels((await api("/api/admin/ai-platform?section=models")).models||[]);
    if(p==="activity")setActivity((await api("/api/admin/ai-platform?section=activity")).activity||[]);
    if(p==="workspace")await refresh();
  }catch(e){setError(e instanceof Error?e.message:"بارگذاری ناموفق بود.")}},[refresh]);

  const loadChats=useCallback(async()=>{try{
    const j=await api("/api/admin/assistant");setConversations(j.conversations||[]);
    if(j.conversations?.[0]){const d=await api("/api/admin/assistant?conversation="+encodeURIComponent(j.conversations[0].id));setActive(d.conversation)}
  }catch(e){setError(e instanceof Error?e.message:"بارگذاری گفتگو ناموفق بود.")}},[]);

  useEffect(()=>{void Promise.all([loadChats(),refresh()])},[loadChats,refresh]);
  useEffect(()=>{void load(panel)},[panel,load]);
  useEffect(()=>{const id=setInterval(()=>void refresh(),5000);return()=>clearInterval(id)},[refresh]);

  async function newChat(){try{
    const j=await api("/api/admin/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create"})});
    setConversations(x=>[j.conversation,...x]);setActive({...j.conversation,messages:[]});setPanel("workspace");setTaskResult(null);
  }catch(e){setError(e instanceof Error?e.message:"ساخت گفتگو ناموفق بود.")}}

  async function submit(ev?:FormEvent){
    ev?.preventDefault();const content=input.trim();if(!content||busy)return;
    setInput("");setError("");setTaskResult(null);setBusy(true);const c=new AbortController();abortRef.current=c;
    try{
      if(mode==="agent"){
        const j=await api("/api/admin/ai-platform",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"dev_run",task:content,apply:true}),signal:c.signal},180000);
        setTaskResult(j.result);await refresh();
      }else{
        if(!active)throw new Error("ابتدا یک گفتگو بساز.");
        const optimistic:Message={role:"user",content};
        setActive(x=>x?{...x,messages:[...(x.messages||[]),optimistic]}:x);
        const j=await api("/api/admin/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"message",conversationId:active.id,content}),signal:c.signal},90000);
        setActive(x=>x?{...x,messages:[...(x.messages||[]).filter(m=>m!==optimistic),optimistic,j.message]}:x);
        await refresh();
      }
    }catch(e){setError(e instanceof Error?e.message:"اجرای درخواست ناموفق بود.");setInput(content)}
    finally{setBusy(false);abortRef.current=null}
  }

  return <main dir="rtl" className="min-h-[calc(100vh-70px)] bg-[#090908] text-sand-50">
    <header className="flex h-16 items-center justify-between border-b border-white/[.07] px-4 lg:px-6">
      <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl border border-gold-400/20 bg-gold-400/10"><Sparkles size={18} className="text-gold-300"/></div>
        <div><div className="flex items-center gap-2"><b className="text-sm">ArtYar AI</b><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">{overview?.github?.ok?"Agent ready":"Connect GitHub"}</span></div><p className="text-[10px] text-ink-600">AI Operating Workspace</p></div>
      </div>
      <div className="flex items-center gap-2"><div className="flex rounded-xl border border-white/10 p-1">
        <button onClick={()=>setMode("chat")} className={`rounded-lg px-3 py-1.5 text-[10px] ${mode==="chat"?"bg-white/10 text-sand-50":"text-ink-600"}`}>Chat</button>
        <button onClick={()=>setMode("agent")} className={`rounded-lg px-3 py-1.5 text-[10px] ${mode==="agent"?"bg-gold-400/15 text-gold-300":"text-ink-600"}`}>Agent</button>
      </div></div>
    </header>

    <div className="border-b border-white/[.06] px-3 py-2 lg:hidden"><div className="flex gap-1 overflow-x-auto">{NAV.map(([id,label,Icon])=><button key={id} onClick={()=>setPanel(id)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] ${panel===id?"bg-white/[.07] text-sand-50":"text-ink-600"}`}><Icon size={13} className="mx-auto mb-1"/>{label}</button>)}</div></div>\n    <div className="grid min-h-[calc(100vh-134px)] lg:grid-cols-[210px_minmax(0,1fr)_290px]">\n      <aside className="hidden border-l border-white/[.07] p-3 lg:block">
        <button onClick={()=>void newChat()} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-xs"><Plus size={14}/> گفتگوی جدید</button>
        <p className="mb-2 px-2 text-[9px] uppercase tracking-[.18em] text-ink-700">Workspace</p>
        {NAV.map(([id,label,Icon])=><button key={id} onClick={()=>setPanel(id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] ${panel===id?"bg-white/[.07] text-sand-50":"text-ink-500 hover:bg-white/[.035]"}`}><Icon size={14}/>{label}</button>)}
        <div className="my-5 border-t border-white/[.06]"/><p className="mb-2 px-2 text-[9px] uppercase tracking-[.18em] text-ink-700">Chats</p>
        <div className="max-h-[45vh] space-y-1 overflow-y-auto">{conversations.map(c=><button key={c.id} onClick={async()=>{const j=await api("/api/admin/assistant?conversation="+encodeURIComponent(c.id));setActive(j.conversation);setPanel("workspace");setTaskResult(null)}} className={`block w-full truncate rounded-lg px-3 py-2 text-right text-[10px] ${active?.id===c.id?"bg-white/[.06] text-sand-50":"text-ink-600"}`}>{c.title||"گفتگو"}</button>)}</div>
      </aside>

      <section className="flex min-w-0 flex-col border-x border-white/[.05]">
        {panel!=="workspace"?<ControlPanel panel={panel} skills={skills} connectors={connectors} models={models} activity={activity} onRefresh={()=>void load(panel)}/>:<>
          <div className="border-b border-white/[.06] px-4 py-2.5 lg:px-6"><div className="flex items-center justify-between text-[10px] text-ink-600"><span className="text-sand-50">{active?.title||"New task"}</span><span>{mode==="agent"?"Coding Agent":"Assistant"} · ArtYar Website</span></div></div>
          <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12"><div className="mx-auto max-w-3xl space-y-5">
            {!active?.messages?.length&&!taskResult?<div className="py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold-400/20 bg-gold-400/[.07]"><Code2 size={24} className="text-gold-300"/></div><h2 className="mt-5 text-2xl font-medium">{mode==="agent"?"What are we building?":"How can I help?"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-600">{mode==="agent"?"Task بده تا repository را بررسی کنم و Draft PR بسازم.":"گفتگو و کارهای مدیریتی."}</p></div>:null}
            {(active?.messages||[]).map((m,i)=><div key={i} className={m.role==="user"?"mr-auto max-w-[90%]":"ml-auto max-w-[94%]"}><p className="mb-1 text-[9px] text-ink-700">{m.role==="user"?"You":"ArtYar AI"}</p><div className={`rounded-2xl px-4 py-3 text-sm leading-7 ${m.role==="user"?"bg-white/[.07]":"border border-white/[.07] bg-black/20 text-ink-200"}`}><div className="whitespace-pre-wrap">{m.content}</div></div></div>)}
            {taskResult?<AgentResult result={taskResult}/>:null}
            {busy?<div className="flex items-center gap-2 text-xs text-ink-500"><Loader2 size={14} className="animate-spin text-gold-300"/> Agent در حال اجراست…</div>:null}
            {error?<div className="flex gap-2 rounded-xl border border-red-400/15 bg-red-400/[.04] p-3 text-xs text-red-300"><X size={14}/>{error}</div>:null}
          </div></div>
          <div className="border-t border-white/[.07] p-3 lg:p-5"><form onSubmit={submit} className="mx-auto max-w-3xl"><div className="rounded-2xl border border-white/10 bg-[#0d0d0c]">
            <textarea value={input} onChange={e=>setInput(e.target.value)} disabled={busy} rows={3} placeholder={mode==="agent"?"Tell the agent what to build, fix, inspect, or ship…":"پیام خود را بنویس…"} className="w-full resize-none bg-transparent px-4 pt-4 text-sm leading-6 text-sand-50 outline-none placeholder:text-ink-700" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit()}}}/>
            <div className="flex items-center justify-between px-3 pb-3"><div className="flex gap-1"><button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-ink-600"><Paperclip size={15}/></button><span className="flex items-center gap-1 px-2 text-[9px] text-ink-700"><ShieldCheck size={12}/> Draft PR safety</span></div>
            {busy?<button type="button" onClick={()=>abortRef.current?.abort()} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><Square size={12} fill="currentColor"/></button>:<button type="submit" disabled={!input.trim()} className="grid h-8 w-8 place-items-center rounded-lg bg-sand-50 text-black disabled:opacity-20"><Send size={14}/></button>}</div>
          </div><p className="mt-2 text-[9px] text-ink-700">Enter برای اجرا · Shift+Enter برای خط جدید · تغییر مستقیم روی main انجام نمی‌شود.</p></form></div>
        </>}
      </section>

      <aside className="hidden border-r border-white/[.07] p-3 xl:block"><p className="mb-3 text-[9px] uppercase tracking-[.18em] text-ink-700">Live Run</p>
        <Status label="GitHub" value={overview?.github?.ok?`${overview.github.owner}/${overview.github.repo}`:"Not connected"} ok={!!overview?.github?.ok}/>
        <Status label="Models" value={`${overview?.modelsEnabled??0} enabled`} ok={(overview?.modelsEnabled??0)>0}/>
        <Status label="Skills" value={`${overview?.skills??0} installed`} ok/>
        <div className="my-5 border-t border-white/[.06]"/><div className="mb-2 flex justify-between"><span className="text-[9px] uppercase tracking-[.18em] text-ink-700">Activity</span><button onClick={()=>void refresh()} className="text-ink-600"><RefreshCw size={11}/></button></div>
        <div className="space-y-2">{activity.slice(0,10).map(a=><div key={a.id} className="rounded-lg border border-white/[.05] p-2"><p className="text-[10px] text-ink-300">{a.message}</p>{a.detail?<p className="mt-1 truncate text-[9px] text-ink-700" dir="ltr">{a.detail}</p>:null}</div>)}</div>
        <div className="my-5 border-t border-white/[.06]"/><div className="rounded-xl border border-gold-400/10 bg-gold-400/[.025] p-3"><div className="flex items-center gap-2 text-[10px] text-gold-300"><ShieldCheck size={13}/> Safety</div><p className="mt-2 text-[9px] leading-4 text-ink-600">Agent از مسیر Draft PR استفاده می‌کند و production را مستقیم تغییر نمی‌دهد.</p></div>
      </aside>
    </div>
  </main>
}

function Status({label,value,ok}:{label:string;value:string;ok:boolean}){return <div className="mb-2 rounded-xl border border-white/[.06] p-3"><div className="flex justify-between text-[10px] text-ink-500">{label}<i className={`h-1.5 w-1.5 rounded-full ${ok?"bg-emerald-400":"bg-amber-400"}`}/></div><p className="mt-2 truncate text-[10px] text-sand-50" dir="ltr">{value}</p></div>}

function AgentResult({result}:{result:any}){return <div className="rounded-2xl border border-white/[.08] bg-[#0c0c0b] p-4"><div className="flex items-center gap-2"><Code2 size={16} className="text-emerald-300"/><div><b className="text-xs">Agent run complete</b><p className="text-[10px] text-ink-600">{result?.filesRead?.length||0} files inspected · {result?.proposedFiles?.length||0} proposed changes · {result?.trace?.length||0} trace events</p></div></div>{result?.trace?.length?<div className="mt-4 space-y-1.5"><p className="text-[9px] uppercase tracking-[.16em] text-ink-700">Execution trace</p>{result.trace.map((e:TraceEvent)=><div key={e.id} className="rounded-lg border border-white/[.05] px-3 py-2"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${e.kind==="error"?"bg-red-400":e.kind==="tool"?"bg-sky-400":e.kind==="model"?"bg-gold-300":"bg-emerald-400"}`}/><span className="text-[10px] text-ink-300">{e.message}</span></div>{e.detail?<p className="mt-1 truncate text-[9px] text-ink-700" dir="ltr">{e.detail}</p>:null}</div>)}</div>:null}{result?.analysis?<pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-xs leading-6 text-ink-300">{result.analysis}</pre>:null}{result?.proposedFiles?.length?<div className="mt-3 space-y-1"><p className="text-[9px] uppercase tracking-[.16em] text-ink-700">Proposed changes</p>{result.proposedFiles.map((f:any)=><div key={f.path} className="rounded-lg border border-white/[.05] px-3 py-2 text-[10px] text-ink-300" dir="ltr">{f.path}</div>)}</div>:null}{result?.pullRequest?.url?<a href={result.pullRequest.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sand-50 px-3 py-2 text-[10px] text-black"><GitBranch size={13}/> Open Draft PR #{result.pullRequest.number}</a>:null}{result?.error?<p className="mt-3 text-[10px] text-red-300">{result.error}</p>:null}</div>}

function ControlPanel({panel,skills,connectors,models,activity,onRefresh}:{panel:Panel;skills:Skill[];connectors:Connector[];models:Model[];activity:ActivityItem[];onRefresh:()=>void}){
  const title=panel==="skills"?"Skills":panel==="connectors"?"Connectors":panel==="memory"?"Memory":panel==="models"?"Models":"Activity";
  return <div className="flex-1 overflow-y-auto p-4 lg:p-8"><div className="mx-auto max-w-4xl"><div className="mb-6 flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[.18em] text-ink-700">ArtYar AI Platform</p><h2 className="mt-1 text-xl font-medium">{title}</h2></div><button onClick={onRefresh} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-ink-500"><RefreshCw size={14}/></button></div>
    {panel==="skills"?<div className="grid gap-3 sm:grid-cols-2">{skills.map(s=><div key={s.id} className="rounded-2xl border border-white/[.07] p-4"><div className="flex justify-between"><span className="flex items-center gap-2 text-sm"><Zap size={14} className="text-gold-300"/>{s.name}</span><span className="text-[9px] text-emerald-300">{s.enabled?"enabled":"disabled"}</span></div><p className="mt-2 text-xs leading-5 text-ink-500">{s.description}</p><div className="mt-3 flex flex-wrap gap-1">{s.tools.slice(0,8).map(t=><span key={t} className="rounded-md border border-white/[.06] px-2 py-1 text-[9px] text-ink-700" dir="ltr">{t}</span>)}</div></div>)}</div>:null}
    {panel==="connectors"?<div className="space-y-2">{connectors.map(c=><div key={c.id} className="flex items-center justify-between rounded-2xl border border-white/[.07] p-4"><div><p className="text-sm">{c.name}</p><p className="mt-1 text-[10px] text-ink-600">{c.hint}</p></div><span className={`text-[9px] ${c.status==="connected"?"text-emerald-300":"text-ink-700"}`}>{c.status}</span></div>)}</div>:null}
    {panel==="models"?<div className="space-y-2">{models.map(m=><div key={m.id} className="flex justify-between rounded-xl border border-white/[.07] p-3"><div><p className="text-xs" dir="ltr">{m.display_name||m.model_id||m.id}</p><p className="mt-1 text-[9px] text-ink-700" dir="ltr">{m.provider_id} · priority {m.priority??"—"}</p></div><span className="text-[9px] text-emerald-300">{m.status}</span></div>)}</div>:null}
    {panel==="activity"?<div className="space-y-2">{activity.map(a=><div key={a.id} className="rounded-xl border border-white/[.06] p-3"><p className="text-xs text-ink-300">{a.message}</p>{a.detail?<p className="mt-1 text-[9px] text-ink-700" dir="ltr">{a.detail}</p>:null}</div>)}</div>:null}
    {panel==="memory"?<div className="rounded-2xl border border-white/[.07] p-6"><Brain className="text-gold-300"/><h3 className="mt-4 text-sm">Project & Admin Memory</h3><p className="mt-2 text-xs leading-6 text-ink-500">Memory backend فعال است؛ مدیریت و ویرایش memory را روی همین workspace ادامه می‌دهیم.</p></div>:null}
  </div></div>
}