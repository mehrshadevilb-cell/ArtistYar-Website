"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Headphones, Piano, Play, RotateCcw, Sparkles } from "lucide-react";
import { ProGate } from "@/components/PracticeProGate";
import { useAuth } from "@/components/AuthProvider";

type Voicing = {
  title: string;
  key: string;
  quality: string;
  notes: string[];
  degrees: string;
  color: string;
  tip: string;
  use: string;
  source?: string;
};

const VOICINGS: Voicing[] = [
  { title: "Maj9 نرم و سینمایی", key: "C", quality: "Cmaj9", notes: ["C2", "G2", "B2", "D3", "E3"], degrees: "1–5–7–9–3", color: "cyan", tip: "صدای ۳ و ۷ را نزدیک نگه دار؛ ۹ را برای هوا و عمق بالاتر اضافه کن.", use: "پد، بالاد و intro خلوت" },
  { title: "Minor 9 مدرن", key: "D", quality: "Dm9", notes: ["D2", "A2", "C3", "E3", "F3"], degrees: "1–5–♭7–9–♭3", color: "violet", tip: "فاصله‌ی ۹ را روشن بگذار و باس را از خوشه‌ی دست راست جدا نگه دار.", use: "R&B، نئو سول و آکوردهای باز" },
  { title: "Dominant 13 رنگی", key: "G", quality: "G13", notes: ["G2", "D3", "F3", "A3", "E4"], degrees: "1–5–♭7–9–13", color: "gold", tip: "برای حل به C، نت F را به E و B را به C هدایت کن؛ حرکت نیم‌پرده‌ای را بشنو.", use: "Turnaround و پایان جمله" },
  { title: "Quartal Lift", key: "F", quality: "F7sus4(9)", notes: ["F2", "C3", "Bb3", "Eb4", "G4"], degrees: "1–5–♭7–♭3–9", color: "emerald", tip: "چهارم‌های روی هم را با پدال زیاد گل‌آلود نکن؛ spacing پایین را باز نگه دار.", use: "Cinematic، gospel و transition" },
  { title: "Tritone Resolve", key: "A", quality: "A7♭9", notes: ["A2", "G3", "C#4", "C4", "Bb4"], degrees: "1–♭7–3–♯9–♭9", color: "orange", tip: "کشش بین C# و G را نگه دار؛ سپس هر دو را به نت‌های آکورد مقصد حل کن.", use: "جاز، tension و pre-chorus" },
  { title: "Open 6/9", key: "Eb", quality: "Eb6/9", notes: ["Eb2", "Bb2", "C3", "F3", "G3"], degrees: "1–5–6–9–3", color: "pink", tip: "این voicing را با رجیستر میانی روشن اجرا کن؛ نت‌های نزدیک را بیش از حد فشرده نکن.", use: "پاپ، لوفای و آکوردهای خوش‌رنگ" },
  { title: "Upper Structure #11", key: "Bb", quality: "Bbmaj7(#11)", notes: ["Bb1", "F2", "A2", "D3", "E3"], degrees: "1–5–7–3–#11", color: "blue", tip: "#11 را مثل نور بالای آکورد بشنو؛ باس و نت رنگی باید از هم تفکیک شوند.", use: "جاز مدرن و sound design" },
];

function midi(note: string) {
  const match = note.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!match) return 60;
  const semitones: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  return (Number(match[3]) + 1) * 12 + (semitones[match[1] + match[2]] ?? 0);
}

let voicingAudioContext: AudioContext | null = null;

async function playVoicing(notes: string[]) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext });
  if (!AudioContextClass) return;
  voicingAudioContext ||= new AudioContextClass();
  if (voicingAudioContext.state === "suspended") await voicingAudioContext.resume();
  const now = voicingAudioContext.currentTime;
  const master = voicingAudioContext.createGain();
  const compressor = voicingAudioContext.createDynamicsCompressor();
  master.gain.value = 0.42; compressor.threshold.value = -18; compressor.ratio.value = 3;
  master.connect(compressor).connect(voicingAudioContext.destination);
  notes.forEach((note, index) => {
    const osc = voicingAudioContext!.createOscillator(), gain = voicingAudioContext!.createGain();
    const start = now + index * 0.09;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi(note) - 69) / 12), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.20 / Math.sqrt(notes.length), start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
    osc.connect(gain).connect(master); osc.start(start); osc.stop(start + 2.8);
  });
}

export function DailyVoicingLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [pro, setPro] = useState(user?.role === "admin");
  const [checking, setChecking] = useState(user?.role !== "admin");
  const [picked, setPicked] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [played, setPlayed] = useState(false);
  const [generated, setGenerated] = useState<Voicing | null>(null);
  const voicing = generated || useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return VOICINGS[day % VOICINGS.length];
  }, []);
  const choices = useMemo(() => [voicing.quality, "Cmaj7", "Dm7", "G7sus4"].sort((a, b) => a.localeCompare(b)), [voicing.quality]);

  function answerVoicing(choice: string) {
    const correct = choice === voicing.quality;
    setPicked(choice);
    setShowAnswer(true);
    if (user?.id) {
      void fetch("/api/practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          gameId: "voicing",
          score: correct ? 25 : -5,
          accuracy: correct ? 100 : 0,
          streak: correct ? 1 : 0,
          bestScore: correct ? 25 : 0,
          metadata: { source: "daily_voicing_lab", quality: voicing.quality, multiAgent: voicing.source === "multi-agent" },
        }),
      });
    }
  }

  useEffect(() => {
    if (user?.role === "admin") { setPro(true); setChecking(false); return; }
    if (!user?.id) { setPro(false); setChecking(false); return; }
    let cancelled = false;
    fetch("/api/practice/status?userId=" + encodeURIComponent(user.id), { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setPro(Boolean(data?.pro)); })
      .catch(() => { if (!cancelled) setPro(false); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || !pro) return;
    const recentKey = `artistyar_voicing_recent_${user.id}`;
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { /* optional */ }
    fetch("/api/practice/voicing", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({ userId:user.id, level:1, recent }) })
      .then((response) => response.json())
      .then((data) => { if (data?.ok && data.question) { setGenerated(data.question); const fp=String(data.question.fingerprint || ""); if (fp) localStorage.setItem(recentKey, JSON.stringify([...recent, fp].slice(-100))); } })
      .catch(() => {});
  }, [user?.id, pro]);

  if (checking) return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی دسترسی Pro…</div></section>;
  if (!pro) return <ProGate onBack={onBack} title="Voicing روزانه" body="هر روز یک Voicing پیانو حرفه‌ای، تمرین شنیداری و نکته‌ی تنظیم برای کاربران Pro." />;

  return (
    <section className="mt-10">
      <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}><ArrowRight size={14} /> بازگشت</button>
      <div className="mt-5 overflow-hidden rounded-3xl border border-gold-400/20 bg-gradient-to-br from-gold-400/[.12] via-white/[.03] to-violet-400/[.08] p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="eyebrow text-gold-300">DAILY VOICING LAB · PRO</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">Voicing امروز: {voicing.title}</h1><p className="mt-2 text-sm leading-7 text-ink-300">یک voicing تازه، یک تمرین شنیداری و یک نکته‌ی قابل استفاده در تنظیم.</p></div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300"><Piano size={27} /></span>
        </div>
        <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs text-ink-500">آکورد و نت‌ها</p><strong className="mt-2 block text-2xl text-sand-50" dir="ltr">{showAnswer ? voicing.quality : "؟ · آکورد را حدس بزن"}</strong>
            <p className="mt-3 text-sm text-ink-300" dir="ltr">{showAnswer ? voicing.notes.join(" · ") : "نت‌ها بعد از پاسخ نمایش داده می‌شوند."}</p><p className="mt-2 text-xs text-gold-300" dir="ltr">{showAnswer ? voicing.degrees : "اول گوش کن، بعد انتخاب کن."}</p>
            <button type="button" className="btn-primary mt-5" onClick={() => { void playVoicing(voicing.notes); setPlayed(true); }}><Play size={15} fill="currentColor" /> {played ? "پخش دوباره" : "شنیدن voicing"}</button>
            <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-ink-400"><Headphones size={15} className="mt-0.5 shrink-0 text-cyan-300" /> با هدفون گوش بده و ابتدا باس، بعد ۳ و ۷ و در آخر نت رنگی را جدا کن.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs text-ink-500">کاربرد حرفه‌ای</p><p className="mt-3 text-sm leading-8 text-sand-100">{voicing.tip}</p><div className="mt-4 rounded-xl border border-gold-400/15 bg-gold-400/[.06] p-4"><span className="text-[11px] text-gold-300">در تنظیم استفاده کن</span><p className="mt-1 text-sm text-ink-200">{voicing.use}</p></div></div>
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.05] p-5"><div className="flex items-center gap-2"><Sparkles size={16} className="text-cyan-200" /><strong className="text-sm text-sand-50">تمرین شنیداری امروز</strong></div><p className="mt-3 text-sm leading-7 text-ink-300">بدون نگاه کردن به جواب، کیفیت آکورد را از روی voicing حدس بزن.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{choices.map((choice) => <button key={choice} type="button" disabled={showAnswer} onClick={() => answerVoicing(choice)} className={`rounded-xl border px-3 py-3 text-xs transition ${showAnswer && choice === voicing.quality ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100" : picked === choice ? "border-red-400/50 bg-red-400/10 text-red-100" : "border-white/10 text-ink-200 hover:border-gold-400/40"}`} dir="ltr">{choice}</button>)}</div>{showAnswer && <p className={picked === voicing.quality ? "mt-4 flex items-center gap-2 text-sm text-emerald-200" : "mt-4 flex items-center gap-2 text-sm text-red-200"}><Check size={15} /> {picked === voicing.quality ? "درست — +25 امتیاز." : "نادرست — 5- امتیاز."} پاسخ امروز: {voicing.quality} · این رکورد در گزارش استفاده ثبت شد.</p>}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500"><span>این تمرین بر اساس تاریخ روز انتخاب می‌شود و تکرار همان روز ندارد.</span>{showAnswer && <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => { setPicked(null); setShowAnswer(false); }}><RotateCcw size={13} /> مرور دوباره</button>}</div>
      </div>
    </section>
  );
}
