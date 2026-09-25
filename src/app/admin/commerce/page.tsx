"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
type Payment={id?:number;status?:string;amount?:number;created_at?:string;student_name?:string};
type Reservation={id?:number;status?:string;student_name?:string;requested_date?:string};
export default function CommercePage(){
 const [payments,setPayments]=useState<Payment[]>([]),[reservations,setReservations]=useState<Reservation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{Promise.all([fetch("/api/rahyar/admin/payments",{credentials:"include",cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"payments");return Array.isArray(d)?d:d.payments||[]}),fetch("/api/rahyar/admin/reservations",{credentials:"include",cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"reservations");return Array.isArray(d)?d:d.reservations||[]})]).then(([p,r])=>{setPayments(p);setReservations(r)}).catch(e=>setError(e instanceof Error?e.message:"خطا")).finally(()=>setLoading(false))},[]);
 const pending=payments.filter(x=>["pending","submitted","payment_submitted"].includes(String(x.status))).length;
 return <div className="space-y-6"><header><p className="eyebrow">/ مرکز تجارت</p><h2 className="mt-3 text-2xl font-semibold text-sand-50">Commerce Control Center</h2><p className="mt-2 text-sm leading-7 text-ink-400">نمای عملیاتی از همان پرداخت‌ها و رزروهای canonical فعلی؛ سیستم مالی موازی ساخته نشده است.</p></header>
 {error&&<p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric title="پرداخت‌ها" value={loading?"…":payments.length}/><Metric title="نیازمند بررسی" value={loading?"…":pending}/><Metric title="رزروها" value={loading?"…":reservations.length}/><Metric title="پرداخت موفق" value={loading?"…":payments.filter(x=>["success","successful","paid","confirmed"].includes(String(x.status))).length}/></div>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["پرداخت‌ها","/admin/payments"],["رزروها","/admin/reservations"],["اشتراک Practice","/admin/practice/subscriptions"],["تحلیل و آمار","/admin/analytics"]].map(([t,h])=><Link key={h} href={h} className="card-ay p-5 hover:border-gold-500/30"><p className="font-medium text-sand-50">{t}</p><p className="mt-2 text-xs text-ink-500">باز کردن ماژول canonical ←</p></Link>)}</div>
 </div>}
function Metric({title,value}:{title:string;value:string|number}){return <div className="card-ay p-5"><p className="text-xs text-ink-500">{title}</p><p className="mt-2 text-2xl font-semibold text-sand-50">{value}</p></div>}
