"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, MessageCircle } from "lucide-react";

type ClassOption = { id: number; name: string; is_active: boolean };

export function QuickConsultationForm() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/rahyar/classes")
      .then((res) => res.json())
      .then((data) => {
        const active = (data.items || []).filter((item: ClassOption) => item.is_active !== false);
        setClasses(active);
        if (active[0]) setSelectedClass(String(active[0].id));
      })
      .catch(() => setClasses([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) {
      setStatus("error");
      setMessage("فعلاً کلاس فعالی برای ثبت درخواست پیدا نشد. از صفحه تماس با ما پیام بگذار.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/rahyar/class-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: Number(selectedClass),
          full_name: String(data.get("full_name") || "").trim(),
          phone: String(data.get("phone") || "").trim(),
          message: String(data.get("message") || "").trim() || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || result.detail || "ثبت درخواست ناموفق بود.");
      setStatus("success");
      setMessage(result.message || "درخواستت ثبت شد؛ به‌زودی برای هماهنگی باهات تماس می‌گیریم.");
      event.currentTarget.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "ثبت درخواست ناموفق بود. دوباره تلاش کن.");
    }
  }

  return (
    <section id="quick-consultation" className="quick-consultation container-ay section-space">
      <div className="quick-consultation-card">
        <div className="quick-consultation-copy">
          <p className="eyebrow">/ شروع سریع</p>
          <h2 className="section-title mt-4">برای شروع مسیرت<br /><span className="text-gold-400">یک مشاوره رایگان بگیر.</span></h2>
          <p className="section-sub">اگر نمی‌دانی از کدام دوره یا کلاس شروع کنی، نام و شماره‌ات را بفرست. مسیر مناسب را با توجه به تجربه و پروژه‌ات با هم مشخص می‌کنیم.</p>
          <div className="quick-consultation-note"><MessageCircle size={17} /><span>بدون تعهد؛ فقط برای اینکه شروع درست‌تری داشته باشی.</span></div>
        </div>
        <form className="quick-consultation-form" onSubmit={onSubmit}>
          <label><span>نام و نام خانوادگی</span><input className="input-ay" name="full_name" placeholder="مثلاً مهرشاد بنائی" required /></label>
          <label><span>شماره موبایل</span><input className="input-ay" name="phone" placeholder="09xxxxxxxxx" inputMode="tel" required /></label>
          <label><span>الان بیشتر روی چه چیزی کار می‌کنی؟ <small>(اختیاری)</small></span><textarea className="input-ay min-h-24 resize-y" name="message" placeholder="مثلاً می‌خواهم میکس وکال را بهتر یاد بگیرم" /></label>
          <button className="btn-primary w-full gap-2" type="submit" disabled={status === "loading"}>{status === "loading" ? <><LoaderCircle size={16} className="animate-spin" /> در حال ارسال...</> : <>درخواست مشاوره رایگان <ArrowLeft size={16} /></>}</button>
          {status === "success" ? <p className="quick-form-message quick-form-success"><Check size={15} /> {message}</p> : null}
          {status === "error" ? <p className="quick-form-message quick-form-error">{message}</p> : null}
        </form>
      </div>
    </section>
  );
}
