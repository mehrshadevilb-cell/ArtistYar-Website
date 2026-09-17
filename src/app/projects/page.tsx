"use client";

import { FormEvent, useEffect, useState } from "react";
import { BriefcaseBusiness, Clock3, MapPin, Send, Sparkles } from "lucide-react";
import { fetchMarketplaceProjects, submitMarketplaceProject, type MarketplaceProject } from "@/lib/project-marketplace-api";

const initialForm = { employer_name: "", employer_contact: "", title: "", description: "", category: "تنظیم و میکس", skills: "", budget_min: "", budget_max: "", deadline: "", remote: true };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<MarketplaceProject[]>([]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("در حال بارگذاری پروژه‌ها…");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void fetchMarketplaceProjects().then((items) => { setProjects(items); setStatus(items.length ? "" : "هنوز پروژهٔ فعالی منتشر نشده است."); }).catch(() => setStatus("فعلاً دریافت پروژه‌ها ممکن نیست.")); }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      await submitMarketplaceProject({ ...form, budget_min: form.budget_min ? Number(form.budget_min) : null, budget_max: form.budget_max ? Number(form.budget_max) : null });
      setForm(initialForm); setStatus("پروژه ثبت شد و پس از بررسی تیم راه‌یار منتشر می‌شود.");
    } catch { setStatus("ثبت پروژه ناموفق بود؛ لطفاً اطلاعات را بررسی و دوباره تلاش کن."); } finally { setBusy(false); }
  }

  return <main className="container-ay section-space">
    <header className="mx-auto max-w-3xl text-center">
      <p className="eyebrow">/ بازار پروژهٔ راه‌یار</p>
      <h1 className="section-title mt-4">پروژه‌ات را به هنرجوی مناسب بسپار</h1>
      <p className="section-sub">کارفرماها پروژه را ثبت می‌کنند، تیم راه‌یار بررسی می‌کند و فرصت‌های واقعی را به هنرجوهای مناسب می‌رساند.</p>
    </header>
    <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <section><div className="mb-5 flex items-center gap-3"><BriefcaseBusiness className="text-gold-400" size={21}/><h2 className="text-xl font-medium text-sand-50">پروژه‌های فعال</h2></div>
        <div className="space-y-4">{projects.map((project) => <article key={project.id} className="card-ay p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="skill-tag">{project.category}</span><h3 className="mt-4 text-lg font-medium text-sand-50">{project.title}</h3></div><Sparkles className="text-gold-400" size={18}/></div><p className="mt-3 text-sm leading-7 text-ink-300">{project.description}</p><div className="mt-5 flex flex-wrap gap-3 text-xs text-ink-400"><span>{project.remote ? "آنلاین / دورکاری" : "پروژه حضوری"}</span>{project.deadline ? <span className="flex items-center gap-1"><Clock3 size={13}/> {project.deadline}</span> : null}{project.budget_max ? <span className="text-gold-400">تا {project.budget_max.toLocaleString("fa-IR")} تومان</span> : null}</div></article>)}{status ? <p className="rounded-2xl border border-white/[.08] p-5 text-sm leading-7 text-ink-400">{status}</p> : null}</div>
      </section>
      <section className="card-ay h-fit p-5 sm:p-7"><div className="flex items-center gap-3"><Send className="text-gold-400" size={20}/><h2 className="text-xl font-medium text-sand-50">ثبت پروژه توسط کارفرما</h2></div><p className="mt-3 text-sm leading-7 text-ink-400">پروژه بعد از بررسی مدیر منتشر می‌شود و اطلاعات تماس شما فقط برای هماهنگی همکاری استفاده خواهد شد.</p><form className="mt-6 space-y-3" onSubmit={onSubmit}><input className="input-ay" required placeholder="نام یا نام شرکت" value={form.employer_name} onChange={(e) => setForm({...form, employer_name:e.target.value})}/><input className="input-ay" required placeholder="شماره تماس یا Telegram" value={form.employer_contact} onChange={(e) => setForm({...form, employer_contact:e.target.value})}/><input className="input-ay" required placeholder="عنوان پروژه" value={form.title} onChange={(e) => setForm({...form, title:e.target.value})}/><select className="input-ay" value={form.category} onChange={(e) => setForm({...form, category:e.target.value})}><option>تنظیم و میکس</option><option>مسترینگ</option><option>آهنگسازی</option><option>ضبط و ادیت</option><option>تولید محتوای صوتی</option></select><textarea className="input-ay min-h-32" required minLength={20} placeholder="شرح پروژه، سبک و خروجی مورد انتظار" value={form.description} onChange={(e) => setForm({...form, description:e.target.value})}/><input className="input-ay" placeholder="مهارت‌های لازم، با ویرگول جدا کن" value={form.skills} onChange={(e) => setForm({...form, skills:e.target.value})}/><div className="grid grid-cols-2 gap-3"><input className="input-ay" type="number" min="0" placeholder="حداقل بودجه" value={form.budget_min} onChange={(e) => setForm({...form, budget_min:e.target.value})}/><input className="input-ay" type="number" min="0" placeholder="حداکثر بودجه" value={form.budget_max} onChange={(e) => setForm({...form, budget_max:e.target.value})}/></div><input className="input-ay" placeholder="مهلت انجام، مثلاً ۱۰ روز" value={form.deadline} onChange={(e) => setForm({...form, deadline:e.target.value})}/><button className="btn-primary min-h-12 w-full" disabled={busy}>{busy ? "در حال ثبت…" : "ارسال برای بررسی راه‌یار"}</button></form></section>
    </div>
  </main>;
}
