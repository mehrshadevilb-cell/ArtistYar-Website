"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Hand,
  Headphones,
  Music2,
  Piano,
  Play,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { ProGate } from "@/components/PracticeProGate";
import { useAuth } from "@/components/AuthProvider";

type FingerNote = {
  note: string;
  hand: "LH" | "RH";
  finger: 1 | 2 | 3 | 4 | 5; // 1=شست … 5=کوچک
  role: string;
};

type DailyLesson = {
  title: string;
  quality: string;
  key: string;
  hands: "یک‌دستی" | "دو‌دستی";
  degrees: string;
  notes: string[];
  fingering: FingerNote[];
  placement: string;
  style: string;
  tip: string;
  useCases: string[];
};

/** یک voicing در روز — آموزش، نه آزمون */
const LESSONS: DailyLesson[] = [
  {
    title: "Maj9 نرم و سینمایی",
    quality: "Cmaj9",
    key: "C",
    hands: "دو‌دستی",
    degrees: "1 – 5 – 7 – 9 – 3",
    notes: ["C2", "G2", "B2", "D3", "E3"],
    fingering: [
      { note: "C2", hand: "LH", finger: 5, role: "root (باس)" },
      { note: "G2", hand: "LH", finger: 1, role: "5" },
      { note: "B2", hand: "RH", finger: 1, role: "7" },
      { note: "D3", hand: "RH", finger: 2, role: "9" },
      { note: "E3", hand: "RH", finger: 3, role: "3" },
    ],
    placement:
      "دست چپ: C پایین و G یک‌اکتاو بالاتر با شست. دست راست: خوشهٔ نزدیک B–D–E در اکتاو میانی. فاصلهٔ بین دو دست را باز نگه دار تا باس گل‌آلود نشود.",
    style: "سینمایی · پد · intro خلوت · نئوکلاسیک",
    tip: "۳ و ۷ را نزدیک نگه دار؛ ۹ را کمی بالاتر برای «هوا» اضافه کن. پدال نیمه‌باز کافی است.",
    useCases: ["بالاد", "intro فیلم/سریال", "لایهٔ پد زیر ملودی"],
  },
  {
    title: "Minor 9 مدرن",
    quality: "Dm9",
    key: "D",
    hands: "دو‌دستی",
    degrees: "1 – 5 – ♭7 – 9 – ♭3",
    notes: ["D2", "A2", "C3", "E3", "F3"],
    fingering: [
      { note: "D2", hand: "LH", finger: 5, role: "root" },
      { note: "A2", hand: "LH", finger: 1, role: "5" },
      { note: "C3", hand: "RH", finger: 1, role: "♭7" },
      { note: "E3", hand: "RH", finger: 2, role: "9" },
      { note: "F3", hand: "RH", finger: 3, role: "♭3" },
    ],
    placement:
      "باس D را با انگشت ۵ چپ محکم بگیر. شست چپ روی A. دست راست خوشهٔ C–E–F را نزدیک هم در رجیستر میانی بگذار؛ از فشردن بیش از حد فاصله‌ها خودداری کن.",
    style: "R&B · نئو سول · پاپ مدرن · chill",
    tip: "۹ را روشن نگه دار و باس را از خوشهٔ دست راست جدا کن تا فضا باز بماند.",
    useCases: ["Verse R&B", "نئو سول", "آکوردهای باز در ballad"],
  },
  {
    title: "Dominant 13 رنگی",
    quality: "G13",
    key: "G",
    hands: "دو‌دستی",
    degrees: "1 – 5 – ♭7 – 9 – 13",
    notes: ["G2", "D3", "F3", "A3", "E4"],
    fingering: [
      { note: "G2", hand: "LH", finger: 5, role: "root" },
      { note: "D3", hand: "LH", finger: 1, role: "5" },
      { note: "F3", hand: "RH", finger: 1, role: "♭7" },
      { note: "A3", hand: "RH", finger: 2, role: "9" },
      { note: "E4", hand: "RH", finger: 4, role: "13" },
    ],
    placement:
      "چپ: G و D. راست: F–A نزدیک هم، E را با انگشت ۴ بالاتر بگیر تا ۱۳ بدرخشد. برای حل به Cmaj، F→E و (اگر B داشتی) B→C را حرکت نیم‌پرده‌ای بده.",
    style: "جاز · turnaround · blues · پایان جمله",
    tip: "۱۳ رنگ اصلی این voicing است؛ آن را غرق پدال نکن.",
    useCases: ["Turnaround به I", "پایان chorus", "blues با رنگ جاز"],
  },
  {
    title: "Quartal Lift",
    quality: "F7sus4(9)",
    key: "F",
    hands: "دو‌دستی",
    degrees: "1 – 5 – ♭7 – ♭3 – 9",
    notes: ["F2", "C3", "Bb3", "Eb4", "G4"],
    fingering: [
      { note: "F2", hand: "LH", finger: 5, role: "root" },
      { note: "C3", hand: "LH", finger: 1, role: "5" },
      { note: "Bb3", hand: "RH", finger: 1, role: "♭7" },
      { note: "Eb4", hand: "RH", finger: 2, role: "♭3 / sus" },
      { note: "G4", hand: "RH", finger: 4, role: "9" },
    ],
    placement:
      "چهارم‌های روی هم را در دست راست با فاصلهٔ باز بگیر. باس F و C را جدا نگه دار. پدال زیاد = گل‌آلود؛ spacing پایین را باز بگذار.",
    style: "سینمایی · gospel · transition · modal jazz",
    tip: "این voicing برای lift قبل از ورود chorus عالی است.",
    useCases: ["Pre-chorus", "gospel lift", "transition سینمایی"],
  },
  {
    title: "Tritone Resolve",
    quality: "A7♭9",
    key: "A",
    hands: "دو‌دستی",
    degrees: "1 – ♭7 – 3 – ♭9",
    notes: ["A2", "G3", "C#4", "Bb4"],
    fingering: [
      { note: "A2", hand: "LH", finger: 5, role: "root" },
      { note: "G3", hand: "LH", finger: 1, role: "♭7" },
      { note: "C#4", hand: "RH", finger: 2, role: "3" },
      { note: "Bb4", hand: "RH", finger: 4, role: "♭9" },
    ],
    placement:
      "کشش بین C# و G (tritone) را حس کن. ♭9 (Bb) را کمی جدا و بالاتر بگیر. بعد هر دو را به نت‌های آکورد مقصد حل کن.",
    style: "جاز · tension · pre-chorus · film noir",
    tip: "بدون حل، این voicing فقط تنش است؛ همیشه مسیر حل را هم تمرین کن.",
    useCases: ["قبل از chorus", "جاز tension", "پل دراماتیک"],
  },
  {
    title: "Open 6/9",
    quality: "Eb6/9",
    key: "Eb",
    hands: "دو‌دستی",
    degrees: "1 – 5 – 6 – 9 – 3",
    notes: ["Eb2", "Bb2", "C3", "F3", "G3"],
    fingering: [
      { note: "Eb2", hand: "LH", finger: 5, role: "root" },
      { note: "Bb2", hand: "LH", finger: 1, role: "5" },
      { note: "C3", hand: "RH", finger: 1, role: "6" },
      { note: "F3", hand: "RH", finger: 2, role: "9" },
      { note: "G3", hand: "RH", finger: 3, role: "3" },
    ],
    placement:
      "رجیستر میانی را روشن نگه دار. خوشهٔ راست را فشرده نکن؛ ۶ و ۹ باید «باز» شنیده شوند.",
    style: "پاپ · لوفای · easy listening · ballad",
    tip: "برای رنگ گرم بدون tension زیاد، یکی از بهترین گزینه‌هاست.",
    useCases: ["Chorus پاپ", "لوفای", "آکوردهای خوش‌رنگ ballad"],
  },
  {
    title: "Upper Structure #11",
    quality: "Bbmaj7(#11)",
    key: "Bb",
    hands: "دو‌دستی",
    degrees: "1 – 5 – 7 – 3 – #11",
    notes: ["Bb1", "F2", "A2", "D3", "E3"],
    fingering: [
      { note: "Bb1", hand: "LH", finger: 5, role: "root عمیق" },
      { note: "F2", hand: "LH", finger: 1, role: "5" },
      { note: "A2", hand: "RH", finger: 1, role: "7" },
      { note: "D3", hand: "RH", finger: 2, role: "3" },
      { note: "E3", hand: "RH", finger: 3, role: "#11" },
    ],
    placement:
      "باس Bb را خیلی پایین بگیر. #11 (E) را مثل نور بالای آکورد جدا کن؛ باس و نت رنگی باید از هم تفکیک شوند.",
    style: "جاز مدرن · sound design · fusion",
    tip: "#11 را غرق نکن؛ کمی جدا و درخشان نگهش دار.",
    useCases: ["جاز مدرن", "لایهٔ sound design", "fusion pad"],
  },
  {
    title: "Shell 3–7 (یک‌دستی)",
    quality: "C7 shell",
    key: "C",
    hands: "یک‌دستی",
    degrees: "3 – ♭7  (با root اختیاری در باس)",
    notes: ["E3", "Bb3"],
    fingering: [
      { note: "E3", hand: "RH", finger: 1, role: "3" },
      { note: "Bb3", hand: "RH", finger: 4, role: "♭7" },
    ],
    placement:
      "فقط با دست راست: شست روی E، انگشت ۴ روی Bb. این shell هویت dominant را می‌سازد. اگر باس می‌خواهی، با پای چپ یا دست چپ فقط C را اضافه کن.",
    style: "جاز · comping · stride سبک · تمرین پایه",
    tip: "قبل از voicingهای شلوغ، shell 3–7 را در همهٔ کلیدها مسلط شو.",
    useCases: ["Comping جاز", "تمرین روزانه", "پایه برای upper structure"],
  },
  {
    title: "Rootless A-form (LH)",
    quality: "Dm7 rootless",
    key: "D",
    hands: "یک‌دستی",
    degrees: "♭3 – 5 – ♭7 – 9",
    notes: ["F3", "A3", "C4", "E4"],
    fingering: [
      { note: "F3", hand: "LH", finger: 5, role: "♭3" },
      { note: "A3", hand: "LH", finger: 3, role: "5" },
      { note: "C4", hand: "LH", finger: 2, role: "♭7" },
      { note: "E4", hand: "LH", finger: 1, role: "9" },
    ],
    placement:
      "همه در دست چپ: انگشت‌گذاری کلاسیک Bill Evans / A-form. باس root را bass player یا پدال می‌گیرد؛ تو رنگ را می‌سازی.",
    style: "جاز · piano trio · ballad با باس جدا",
    tip: "دست راست آزاد برای ملودی یا upper structure می‌ماند.",
    useCases: ["Piano trio", "jazz ballad", "comping با باس"],
  },
  {
    title: "Gospel Stack",
    quality: "C/E (gospel)",
    key: "C",
    hands: "دو‌دستی",
    degrees: "3 در باس · 1–5–1 در راست",
    notes: ["E2", "C3", "G3", "C4"],
    fingering: [
      { note: "E2", hand: "LH", finger: 5, role: "3 در باس" },
      { note: "C3", hand: "RH", finger: 1, role: "1" },
      { note: "G3", hand: "RH", finger: 2, role: "5" },
      { note: "C4", hand: "RH", finger: 5, role: "1 اکتاو" },
    ],
    placement:
      "باس را روی ۳ (E) بگذار نه root — صدای gospel/church می‌دهد. راست: C–G–C را محکم و باز بگیر.",
    style: "Gospel · worship · soul · R&B ballad",
    tip: "برای حرکت بعدی، باس را stepwise به F یا G ببر.",
    useCases: ["Gospel chorus", "worship", "soul ballad"],
  },
];

const FINGER_FA: Record<number, string> = {
  1: "شست",
  2: "اشاره",
  3: "وسط",
  4: "انگشتری",
  5: "کوچک",
};

function midi(note: string) {
  const match = note.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!match) return 60;
  const semitones: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };
  return (Number(match[3]) + 1) * 12 + (semitones[match[1] + match[2]] ?? 0);
}

let voicingAudioContext: AudioContext | null = null;

async function playVoicing(notes: string[]) {
  if (typeof window === "undefined") return;
  const AC =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  voicingAudioContext ||= new AC();
  if (voicingAudioContext.state === "suspended") await voicingAudioContext.resume();
  const now = voicingAudioContext.currentTime;
  const master = voicingAudioContext.createGain();
  const compressor = voicingAudioContext.createDynamicsCompressor();
  master.gain.value = 0.42;
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  master.connect(compressor).connect(voicingAudioContext.destination);
  notes.forEach((note, index) => {
    const osc = voicingAudioContext!.createOscillator();
    const gain = voicingAudioContext!.createGain();
    const start = now + index * 0.08;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi(note) - 69) / 12), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2 / Math.sqrt(notes.length), start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.8);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 3);
  });
}

export function DailyVoicingLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [pro, setPro] = useState(user?.role === "admin");
  const [checking, setChecking] = useState(user?.role !== "admin");
  const [played, setPlayed] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [saving, setSaving] = useState(false);

  const lesson = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return LESSONS[day % LESSONS.length];
  }, []);

  const lh = lesson.fingering.filter((f) => f.hand === "LH");
  const rh = lesson.fingering.filter((f) => f.hand === "RH");

  useEffect(() => {
    if (user?.role === "admin") {
      setPro(true);
      setChecking(false);
      return;
    }
    if (!user?.id) {
      setPro(false);
      setChecking(false);
      return;
    }
    let cancelled = false;
    const ids = [user.id, user.telegramId].filter(Boolean).map(String);
    fetch(
      "/api/practice/status?userId=" +
        encodeURIComponent(ids[0]) +
        (ids[1] ? "&telegramId=" + encodeURIComponent(ids[1]) : ""),
      { cache: "no-store", credentials: "include" },
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPro(Boolean(data?.pro));
      })
      .catch(() => {
        if (!cancelled) setPro(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, user?.telegramId]);

  const markPracticed = async () => {
    if (practiced || saving) return;
    setSaving(true);
    try {
      if (user?.id) {
        await fetch("/api/practice/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
            telegramId: user.telegramId,
            gameId: "voicing",
            score: 20,
            accuracy: 100,
            streak: 1,
            bestScore: 20,
            metadata: {
              source: "daily_voicing_lesson",
              quality: lesson.quality,
              title: lesson.title,
              hands: lesson.hands,
              style: lesson.style,
              dailyKey: new Date().toISOString().slice(0, 10),
            },
          }),
        });
      }
      setPracticed(true);
    } catch {
      setPracticed(true);
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی دسترسی Pro…</div>
      </section>
    );
  }

  if (!pro) {
    return (
      <ProGate
        onBack={onBack}
        title="Voicing روزانه"
        body="هر روز یک voicing پیانو با انگشت‌گذاری، نحوهٔ گرفتن و سبک استفاده — فقط برای Pro."
      />
    );
  }

  return (
    <section className="mt-10">
      <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
        <ArrowRight size={14} /> بازگشت
      </button>

      <div className="mt-5 overflow-hidden rounded-3xl border border-gold-400/20 bg-gradient-to-br from-gold-400/[.12] via-white/[.03] to-violet-400/[.08] p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-gold-300">DAILY VOICING · آموزش یک‌روزه</p>
            <h1 className="mt-3 text-2xl font-semibold text-sand-50">{lesson.title}</h1>
            <p className="mt-2 text-sm leading-7 text-ink-300">
              امروز یاد بگیر این voicing را چطور روی پیانو بگیری — نه اینکه اسم آکورد را حدس بزنی.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
            <Piano size={27} />
          </span>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] text-ink-500">آکورد</p>
            <strong className="mt-1 block text-xl text-sand-50" dir="ltr">
              {lesson.quality}
            </strong>
            <span className="mt-1 block text-xs text-ink-400" dir="ltr">
              Key {lesson.key} · {lesson.degrees}
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] text-ink-500">نحوهٔ اجرا</p>
            <strong className="mt-1 flex items-center gap-2 text-lg text-sand-50">
              <Hand size={18} className="text-cyan-300" />
              {lesson.hands}
            </strong>
            <span className="mt-1 block text-xs text-ink-400">
              {lh.length ? `چپ ${lh.length} نت` : "چپ آزاد"}
              {" · "}
              {rh.length ? `راست ${rh.length} نت` : "راست آزاد"}
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] text-ink-500">سبک استفاده</p>
            <strong className="mt-1 block text-sm leading-6 text-sand-50">{lesson.style}</strong>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              void playVoicing(lesson.notes);
              setPlayed(true);
            }}
          >
            <Play size={15} fill="currentColor" /> {played ? "پخش دوباره" : "شنیدن voicing"}
          </button>
          <span className="flex items-center gap-2 text-xs text-ink-400">
            <Headphones size={14} className="text-cyan-300" />
            نت‌ها: <span dir="ltr">{lesson.notes.join(" · ")}</span>
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-gold-300" />
              <strong className="text-sm text-sand-50">انگشت‌گذاری روی پیانو</strong>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">۱ = شست · ۵ = انگشت کوچک (هر دو دست)</p>

            {lh.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-cyan-200">دست چپ (LH)</p>
                <div className="space-y-2">
                  {lh.map((f) => (
                    <div
                      key={f.note + f.finger}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-2"
                    >
                      <span className="font-mono text-sm text-sand-50" dir="ltr">
                        {f.note}
                      </span>
                      <span className="text-xs text-ink-400">{f.role}</span>
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] text-cyan-100">
                        انگشت {f.finger} · {FINGER_FA[f.finger]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rh.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-violet-200">دست راست (RH)</p>
                <div className="space-y-2">
                  {rh.map((f) => (
                    <div
                      key={f.note + f.finger}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-2"
                    >
                      <span className="font-mono text-sm text-sand-50" dir="ltr">
                        {f.note}
                      </span>
                      <span className="text-xs text-ink-400">{f.role}</span>
                      <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-[11px] text-violet-100">
                        انگشت {f.finger} · {FINGER_FA[f.finger]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2">
                <Music2 size={16} className="text-emerald-300" />
                <strong className="text-sm text-sand-50">چطور بگیریم</strong>
              </div>
              <p className="mt-3 text-sm leading-8 text-ink-200">{lesson.placement}</p>
            </div>

            <div className="rounded-2xl border border-gold-400/15 bg-gold-400/[.06] p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-gold-300" />
                <strong className="text-sm text-sand-50">نکتهٔ اجرایی</strong>
              </div>
              <p className="mt-3 text-sm leading-8 text-ink-200">{lesson.tip}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {lesson.useCases.map((u) => (
                  <span
                    key={u}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-ink-300"
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-500">هر روز یک voicing جدید بر اساس تاریخ. امروز را روی پیانو تکرار کن.</p>
          <button
            type="button"
            className="btn-primary !px-4 !py-2 text-xs"
            disabled={practiced || saving}
            onClick={() => void markPracticed()}
          >
            {practiced ? (
              <>
                <Check size={14} /> تمرین امروز ثبت شد (+۲۰)
              </>
            ) : saving ? (
              "…"
            ) : (
              "تمرین کردم — ثبت پیشرفت"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
