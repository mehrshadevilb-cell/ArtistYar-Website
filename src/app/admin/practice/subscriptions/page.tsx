"use client";

import { useEffect, useState } from "react";

type PaymentRequest={id:string;user_id:string;reference:string;amount_toman:number;status:string;created_at:string};

export default function PracticeSubscriptionsAdmin(){
  const [requests,setRequests]=useState<PaymentRequest[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const load=async()=>{setLoading(true);try{const r=await fetch("/api/admin/practice/payment-requests",{cache:"no-store",credentials:"include"});const d=await r.json();if(r.ok)setRequests(d.requests||[]);}finally{setLoading(false)}};
  useEffect(()=>{void load()},[]);
  const review=async(id:string,action:"approve"|"reject")=>{
    setBusy(id+action);
    try{const r=await fetch("/api/admin/practice/payment-requests",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({requestId:id,action})});if(r.ok)await load();}finally{setBusy("")}
  };
  return <div className="space-y-6"><div><p className="eyebrow">PRACTICE / PRO PAYMENTS</p><h1 className="mt-2 text-2xl font-semibold text-sand-50">درخواست‌های کارت‌به‌کارت Pro</h1><p className="mt-2 text-sm leading-7 text-ink-400">پس از تطبیق کد پیگیری با تراکنش بانکی، تأیید کن تا اشتراک یک‌ماهه ۴۰٬۰۰۰ تومانی فعال شود.</p></div>
    <div className="card-ay overflow-hidden"><div className="border-b border-white/[.07] p-4 text-sm text-ink-400">{loading?"در حال دریافت…":requests.length?requests.length+" درخواست در انتظار بررسی":"درخواستی در انتظار بررسی نیست"}</div>
    <div className="divide-y divide-white/[.06]">{requests.map(x=><div key={x.id} className="p-5"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-sm text-sand-50">User ID: <span className="select-all">{x.user_id}</span></p><p className="mt-1 text-xs text-ink-500">کد پیگیری: <strong className="select-all text-gold-300">{x.reference}</strong> · {new Date(x.created_at).toLocaleString("fa-IR")}</p><p className="mt-1 text-xs text-ink-500">مبلغ: {Number(x.amount_toman).toLocaleString("fa-IR")} تومان</p></div><div className="flex gap-2"><button className="btn-primary !px-4 !py-2 text-xs" disabled={busy.length>0} onClick={()=>void review(x.id,"approve")}>{busy===x.id+"approve"?"…":"تأیید و فعال‌سازی"}</button><button className="btn-ghost !px-4 !py-2 text-xs" disabled={busy.length>0} onClick={()=>void review(x.id,"reject")}>{busy===x.id+"reject"?"…":"رد"}</button></div></div></div>)}</div></div>
  </div>;
}
