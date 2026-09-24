"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Sparkles, AlertCircle, Copy, Check, Save, RotateCcw,
  FlaskConical, Mic2, Shield, Dna, User,
} from "lucide-react";

type Mode =
  | "write_full" | "write_chorus" | "write_verse" | "write_pre_chorus"
  | "write_bridge" | "write_outro" | "improve" | "rhyme" | "title_ideas"
  | "structure" | "continue" | "rewrite" | "shorten" | "emotional"
  | "conversational" | "visual" | "bold" | "critic" | "idea_analyze"
  | "hook_lab" | "anti_cliche" | "save_lyric" | "hit_dna" | "human_tests"
  | "artist_voice";

type SectionId = "verse" | "pre_chorus" | "chorus" | "bridge" | "outro" | "hook" | "other";
type Section = { id: string; type: SectionId; label: string; text: string };
type ArtistVoice = {
  name: string; styleNotes: string; preferredWords: string; avoidedWords: string;
  register: "" | "colloquial" | "literary" | "mixed";
  rhymePreference: "" | "loose" | "tight" | "free";
};
type DnaResult = {
  structureScore: number; hookPresence: number; repetitionIndex: number;
  narrativeClarity: number; emotionalArc: number; rhymeDensity: number;
  registerConsistency: number; phraseDensity: number; memorabilitySignal: number;
  overall: number; notes: string[]; disclaimer: string;
};
type HumanTest = { id: string; label: string; score: number; summary: string; tips: string[] };

const STORAGE_KEY = "hitnevis_workspace_v2";
const ORIGINAL_KEY = "hitnevis_original_v2";

const WRITE_MODES: { id: Mode; label: string }[] = [
  { id: "write_full", label: "ترانه کامل" },
  { id: "write_verse", label: "ورس" },
  { id: "write_pre_chorus", label: "پری‌کورس" },
  { id: "write_chorus", label: "کورس" },
  { id: "write_bridge", label: "بریج" },
  { id: "write_outro", label: "اوت‌رو" },
];
const ACTION_MODES: { id: Mode; label: string }[] = [
  { id: "continue", label: "ادامه" }, { id: "rewrite", label: "بازنویسی" },
  { id: "shorten", label: "کوتاه" }, { id: "emotional", label: "احساسی" },
  { id: "conversational", label: "محاوره" }, { id: "visual", label: "تصویری" },
  { id: "bold", label: "جسور" }, { id: "improve", label: "بهبود" },
  { id: "rhyme", label: "قافیه" },
];
const LAB_MODES: { id: Mode; label: string; icon: "flask" | "mic" | "shield" | "dna" | "user" }[] = [
  { id: "idea_analyze", label: "تحلیل ایده", icon: "flask" },
  { id: "hook_lab", label: "آزمایشگاه هوک", icon: "mic" },
  { id: "critic", label: "منتقد حرفه‌ای", icon: "flask" },
  { id: "anti_cliche", label: "ضدکلیشه", icon: "shield" },
  { id: "save_lyric", label: "نجات ترانه", icon: "flask" },
  { id: "hit_dna", label: "Hit DNA", icon: "dna" },
  { id: "human_tests", label: "تست انسانی", icon: "user" },
  { id: "artist_voice", label: "صدای هنرمند", icon: "user" },
];
const GENRES = [
  { id: "", label: "ژانر" }, { id: "pop", label: "پاپ" }, { id: "hiphop", label: "هیپ‌هاپ" },
  { id: "rock", label: "راک" }, { id: "traditional", label: "سنتی" },
  { id: "electronic", label: "الکترونیک" }, { id: "rnb", label: "R&B" },
  { id: "folk", label: "فولک" }, { id: "other", label: "دیگر" },
];
const TONES = [
  { id: "", label: "حس" }, { id: "romantic", label: "عاشقانه" }, { id: "sad", label: "غمگین" },
  { id: "hopeful", label: "امیدوار" }, { id: "angry", label: "عصبانی" },
  { id: "playful", label: "شوخ" }, { id: "epic", label: "حماسی" }, { id: "neutral", label: "خنثی" },
];
const DEFAULT_SECTIONS: Section[] = [
  { id: "s-verse-1", type: "verse", label: "ورس ۱", text: "" },
  { id: "s-pre", type: "pre_chorus", label: "پری‌کورس", text: "" },
  { id: "s-chorus", type: "chorus", label: "کورس", text: "" },
  { id: "s-bridge", type: "bridge", label: "بریج", text: "" },
  { id: "s-outro", type: "outro", label: "اوت‌رو", text: "" },
];

function emptyVoice(): ArtistVoice {
  return { name: "", styleNotes: "", preferredWords: "", avoidedWords: "", register: "", rhymePreference: "" };
}
function sectionsToText(sections: Section[]): string {
  return sections.filter((s) => s.text.trim()).map((s) => `[${s.label}]\n${s.text.trim()}`).join("\n\n");
}
function uid(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type ApiOk = { ok: true; text: string; provider: string; model: string; latencyMs: number; requestId: string; directions?: string[] };
type ApiErr = { ok: false; error: string; code?: string; retryable?: boolean; requestId?: string };

export default function HitNevisClient() {
  const [title, setTitle] = useState("ترانهٔ بدون عنوان");
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("");
  const [tone, setTone] = useState("");
  const [constraints, setConstraints] = useState("");
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState(DEFAULT_SECTIONS[0].id);
  const [mode, setMode] = useState<Mode>("write_full");
  const [output, setOutput] = useState("");
  const [directions, setDirections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [meta, setMeta] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [voice, setVoice] = useState<ArtistVoice>(emptyVoice());
  const [showVoice, setShowVoice] = useState(false);
  const [dna, setDna] = useState<DnaResult | null>(null);
  const [humanTests, setHumanTests] = useState<HumanTest[] | null>(null);
  const [humanOverall, setHumanOverall] = useState<number | null>(null);
  const [cliches, setCliches] = useState<string[]>([]);
  const [tab, setTab] = useState<"editor" | "labs" | "dna">("editor");
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) || sections[0],
    [sections, activeSectionId],
  );
  const fullLyrics = useMemo(() => sectionsToText(sections), [sections]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.topic === "string") setTopic(d.topic);
        if (typeof d.genre === "string") setGenre(d.genre);
        if (typeof d.tone === "string") setTone(d.tone);
        if (typeof d.constraints === "string") setConstraints(d.constraints);
        if (Array.isArray(d.sections) && d.sections.length) {
          setSections(d.sections as Section[]);
          setActiveSectionId((d.sections as Section[])[0].id);
        }
        if (typeof d.output === "string") setOutput(d.output);
        if (d.voice && typeof d.voice === "object") setVoice({ ...emptyVoice(), ...(d.voice as ArtistVoice) });
        if (typeof d.mode === "string") setMode(d.mode as Mode);
      }
    } catch { /* ignore corrupt */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          title, topic, genre, tone, constraints, sections, output, voice, mode,
          savedAt: new Date().toISOString(),
        }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 900);
      } catch { /* storage full */ }
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, topic, genre, tone, constraints, sections, output, voice, mode, hydrated]);

  const lockOriginal = useCallback(() => {
    try {
      if (!localStorage.getItem(ORIGINAL_KEY) && fullLyrics.trim()) {
        localStorage.setItem(ORIGINAL_KEY, fullLyrics);
      }
    } catch { /* ignore */ }
  }, [fullLyrics]);

  const restoreOriginal = useCallback(() => {
    try {
      const raw = localStorage.getItem(ORIGINAL_KEY);
      if (!raw) {
        setError("پیش‌نویس اصلی ذخیره نشده است.");
        setRetryable(false);
        return;
      }
      setSections((prev) => {
        const next = [...prev];
        if (next[0]) next[0] = { ...next[0], text: raw };
        return next;
      });
      setOutput("");
    } catch {
      setError("بازیابی پیش‌نویس ممکن نشد.");
    }
  }, []);

  const updateSectionText = (id: string, text: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };
  const addSection = (type: SectionId, label: string) => {
    const s: Section = { id: uid(), type, label, text: "" };
    setSections((prev) => [...prev, s]);
    setActiveSectionId(s.id);
  };

  const buildArtistVoicePayload = () => {
    if (!voice.name && !voice.styleNotes && !voice.preferredWords && !voice.avoidedWords && !voice.register && !voice.rhymePreference) {
      return undefined;
    }
    return {
      name: voice.name || undefined,
      styleNotes: voice.styleNotes || undefined,
      preferredWords: voice.preferredWords ? voice.preferredWords.split(/[,،]/).map((x) => x.trim()).filter(Boolean) : undefined,
      avoidedWords: voice.avoidedWords ? voice.avoidedWords.split(/[,،]/).map((x) => x.trim()).filter(Boolean) : undefined,
      register: voice.register || undefined,
      rhymePreference: voice.rhymePreference || undefined,
    };
  };

  const runGenerate = useCallback(async (overrideMode?: Mode) => {
    const m = overrideMode || mode;
    setError(null);
    setRetryable(false);
    setMeta(null);
    setDirections([]);
    setLoading(true);
    lockOriginal();
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const sectionText = activeSection?.text?.trim() || "";
    const existing =
      m === "write_full" || m === "structure" || m === "title_ideas" || m === "idea_analyze"
        ? fullLyrics || sectionText
        : sectionText || fullLyrics;

    try {
      if (m === "hit_dna" || m === "human_tests") {
        const res = await fetch("/api/hitnevis/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: existing || topic,
            kind: m === "hit_dna" ? "dna" : "human",
            artistNotes: voice.styleNotes || undefined,
          }),
          signal: ac.signal,
          cache: "no-store",
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error || "تحلیل ممکن نشد");
          setRetryable(true);
          return;
        }
        if (m === "hit_dna") {
          setDna(data.dna);
          setOutput(data.report || data.dnaReport || "");
          setTab("dna");
        } else {
          setHumanTests(data.human?.tests || null);
          setHumanOverall(data.human?.overall ?? null);
          setOutput(data.report || data.humanReport || "");
          setTab("dna");
        }
        setMeta("local-analytical");
        return;
      }

      const res = await fetch("/api/hitnevis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: m,
          topic: topic.trim() || undefined,
          existingLyrics: existing || undefined,
          sectionType: activeSection?.type,
          genre: genre || undefined,
          tone: tone || undefined,
          constraints: constraints.trim() || undefined,
          language: "fa",
          artistVoice: buildArtistVoicePayload(),
          directionsCount: m === "save_lyric" ? 3 : undefined,
        }),
        signal: ac.signal,
        cache: "no-store",
      });

      const data = (await res.json()) as ApiOk | ApiErr;
      if (!data.ok) {
        setError(data.error || "خطای ناشناخته");
        setRetryable(Boolean(data.retryable));
        return;
      }
      setOutput(data.text);
      if (data.directions?.length) setDirections(data.directions);
      setMeta(`${data.provider} · ${data.model} · ${data.latencyMs}ms · ${data.requestId}`);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setError("درخواست لغو شد.");
        setRetryable(true);
      } else {
        setError("ارتباط با سرور برقرار نشد. پیش‌نویس محفوظ است.");
        setRetryable(true);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, topic, genre, tone, constraints, activeSection, fullLyrics, voice, lockOriginal]);

  const runLocalCliche = async () => {
    try {
      const res = await fetch("/api/hitnevis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullLyrics || activeSection?.text || topic, kind: "cliche" }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) setCliches(data.cliches || []);
    } catch { /* non-fatal */ }
  };

  const applyToActive = () => {
    if (!output || !activeSection) return;
    updateSectionText(activeSection.id, output);
  };
  const applyDirection = (dir: string) => {
    if (!activeSection) return;
    updateSectionText(activeSection.id, dir);
  };
  const copyOut = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-ink-400">
        <Loader2 className="me-2 animate-spin" size={18} />
        بازیابی پیش‌نویس…
      </div>
    );
  }

  const chip = (active: boolean) =>
    active ? "bg-gold-400/20 text-gold-200 ring-1 ring-gold-400/40" : "bg-ink-900/60 text-ink-400";

  return (
    <div className="space-y-5" dir="rtl">
      <div className="card-ay flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          className="min-w-[12rem] flex-1 bg-transparent text-lg font-medium text-sand-50 outline-none"
          placeholder="عنوان ترانه"
        />
        <span className="text-[10px] text-ink-500">
          {savedFlash ? (
            <span className="inline-flex items-center gap-1 text-emerald-400"><Save size={12} /> ذخیره شد</span>
          ) : "ذخیرهٔ خودکار"}
        </span>
        <button type="button" onClick={restoreOriginal} className="inline-flex items-center gap-1 rounded-lg border border-ink-600 px-2 py-1 text-xs text-ink-300" title="بازیابی متن اصلی">
          <RotateCcw size={12} /> اصل هنرمند
        </button>
        <button type="button" onClick={() => setShowVoice((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-ink-600 px-2 py-1 text-xs text-ink-300">
          <User size={12} /> صدای هنرمند
        </button>
      </div>

      {showVoice && (
        <div className="card-ay grid gap-3 p-4 sm:grid-cols-2">
          <label className="block text-xs text-ink-400">نام / هویت
            <input value={voice.name} onChange={(e) => setVoice((v) => ({ ...v, name: e.target.value.slice(0, 80) }))} className="mt-1 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50" />
          </label>
          <label className="block text-xs text-ink-400">رجیستر
            <select value={voice.register} onChange={(e) => setVoice((v) => ({ ...v, register: e.target.value as ArtistVoice["register"] }))} className="mt-1 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50">
              <option value="">—</option>
              <option value="colloquial">محاوره</option>
              <option value="literary">ادبی</option>
              <option value="mixed">ترکیبی</option>
            </select>
          </label>
          <label className="block text-xs text-ink-400 sm:col-span-2">یادداشت سبک
            <textarea value={voice.styleNotes} onChange={(e) => setVoice((v) => ({ ...v, styleNotes: e.target.value.slice(0, 500) }))} rows={2} className="mt-1 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50" />
          </label>
          <label className="block text-xs text-ink-400">واژه‌های مورد علاقه
            <input value={voice.preferredWords} onChange={(e) => setVoice((v) => ({ ...v, preferredWords: e.target.value.slice(0, 300) }))} className="mt-1 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50" />
          </label>
          <label className="block text-xs text-ink-400">پرهیز از
            <input value={voice.avoidedWords} onChange={(e) => setVoice((v) => ({ ...v, avoidedWords: e.target.value.slice(0, 300) }))} className="mt-1 w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50" />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([{ id: "editor" as const, label: "ویرایشگر" }, { id: "labs" as const, label: "آزمایشگاه‌ها" }, { id: "dna" as const, label: "Hit DNA" }]).map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`rounded-full px-4 py-1.5 text-xs ${chip(tab === t.id)}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-ay space-y-3 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input value={topic} onChange={(e) => setTopic(e.target.value.slice(0, 500))} placeholder="موضوع / حس" className="col-span-2 rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50 sm:col-span-2" />
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-xl border border-ink-700/80 bg-ink-950/80 px-2 py-2 text-xs text-sand-50">
              {GENRES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="rounded-xl border border-ink-700/80 bg-ink-950/80 px-2 py-2 text-xs text-sand-50">
              {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {(tab === "editor" || tab === "labs") && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => (
                  <button key={s.id} type="button" onClick={() => setActiveSectionId(s.id)} className={`rounded-lg px-2.5 py-1 text-[11px] ${activeSectionId === s.id ? "bg-gold-400/15 text-gold-200" : "bg-ink-900 text-ink-400"}`}>
                    {s.label}{s.text.trim() ? " ·" : ""}
                  </button>
                ))}
                <button type="button" onClick={() => addSection("verse", `ورس ${sections.filter((x) => x.type === "verse").length + 1}`)} className="rounded-lg border border-dashed border-ink-600 px-2 py-1 text-[11px] text-ink-400">+ ورس</button>
              </div>
              <textarea
                value={activeSection?.text || ""}
                onChange={(e) => activeSection && updateSectionText(activeSection.id, e.target.value.slice(0, 4000))}
                rows={12}
                placeholder={`متن ${activeSection?.label || "بخش"}…`}
                className="w-full resize-y rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-3 text-sm leading-8 text-sand-50 outline-none focus:border-gold-400/40"
                dir="auto"
              />
              <input value={constraints} onChange={(e) => setConstraints(e.target.value.slice(0, 400))} placeholder="محدودیت‌ها (اختیاری)" className="w-full rounded-xl border border-ink-700/80 bg-ink-950/80 px-3 py-2 text-sm text-sand-50" />
            </>
          )}

          {tab === "editor" && (
            <div className="space-y-2">
              <p className="text-[11px] text-ink-500">نوشتن</p>
              <div className="flex flex-wrap gap-1.5">
                {WRITE_MODES.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${mode === m.id ? "bg-gold-400/20 text-gold-200" : "bg-ink-900 text-ink-400"}`}>{m.label}</button>
                ))}
              </div>
              <p className="text-[11px] text-ink-500">اقدامات</p>
              <div className="flex flex-wrap gap-1.5">
                {ACTION_MODES.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${mode === m.id ? "bg-gold-400/20 text-gold-200" : "bg-ink-900 text-ink-400"}`}>{m.label}</button>
                ))}
              </div>
            </div>
          )}

          {tab === "labs" && (
            <div className="flex flex-wrap gap-2">
              {LAB_MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => { setMode(m.id); void runGenerate(m.id); }} className="inline-flex items-center gap-1.5 rounded-xl border border-ink-600/80 bg-ink-900/50 px-3 py-2 text-xs text-sand-100 hover:border-gold-400/30">
                  {m.icon === "dna" ? <Dna size={14} /> : m.icon === "shield" ? <Shield size={14} /> : m.icon === "mic" ? <Mic2 size={14} /> : m.icon === "user" ? <User size={14} /> : <FlaskConical size={14} />}
                  {m.label}
                </button>
              ))}
              <button type="button" onClick={() => void runLocalCliche()} className="rounded-xl border border-ink-600/80 px-3 py-2 text-xs text-ink-300">اسکن کلیشه (محلی)</button>
            </div>
          )}

          {tab === "dna" && (
            <div className="space-y-3 text-sm text-ink-300">
              <p className="text-xs text-ink-500">تحلیل الگو روی متن خودت — بدون کپی. تضمین هیت نیست.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={loading} onClick={() => void runGenerate("hit_dna")} className="rounded-xl bg-gold-400/90 px-3 py-2 text-xs font-medium text-ink-950">اجرای Hit DNA</button>
                <button type="button" disabled={loading} onClick={() => void runGenerate("human_tests")} className="rounded-xl border border-ink-600 px-3 py-2 text-xs text-sand-100">تست‌های انسانی</button>
              </div>
              {dna && (
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {([
                    ["ساختار", dna.structureScore], ["هوک", dna.hookPresence], ["تکرار", dna.repetitionIndex],
                    ["روایت", dna.narrativeClarity], ["احساس", dna.emotionalArc], ["قافیه", dna.rhymeDensity],
                    ["رجیستر", dna.registerConsistency], ["عبارت", dna.phraseDensity], ["حافظه", dna.memorabilitySignal],
                  ] as const).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-ink-950/70 px-2 py-2">
                      <div className="text-ink-500">{k}</div>
                      <div className="text-sand-50">{v}/10</div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-gold-400/10 px-2 py-2 sm:col-span-3">جمع: {dna.overall}/10</div>
                </div>
              )}
              {humanTests && (
                <div className="space-y-2">
                  <p className="text-xs text-gold-200">میانگین تست‌ها: {humanOverall}/10</p>
                  {humanTests.map((t) => (
                    <div key={t.id} className="rounded-lg bg-ink-950/60 px-3 py-2 text-xs">
                      <div className="font-medium text-sand-100">{t.label}: {t.score}/10</div>
                      <div className="text-ink-400">{t.summary}</div>
                    </div>
                  ))}
                </div>
              )}
              {cliches.length > 0 && <p className="text-xs text-amber-200/90">کلیشه: {cliches.join("، ")}</p>}
            </div>
          )}

          {(tab === "editor" || tab === "labs") && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" disabled={loading} onClick={() => void runGenerate()} className="inline-flex items-center gap-2 rounded-xl bg-gold-400/90 px-4 py-2.5 text-sm font-medium text-ink-950 disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? "در حال تولید…" : "اجرا"}
              </button>
              {loading && (
                <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-xl border border-ink-600 px-3 py-2.5 text-xs text-ink-300">لغو</button>
              )}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-3 text-sm text-red-100">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p>{error}</p>
                {retryable && (
                  <button type="button" onClick={() => void runGenerate()} className="mt-2 text-xs text-gold-300 underline">تلاش دوباره</button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card-ay flex min-h-[360px] flex-col p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-sand-100">خروجی AI</h2>
            <div className="flex flex-wrap gap-2">
              {output && (
                <>
                  <button type="button" onClick={copyOut} className="inline-flex items-center gap-1 rounded-lg border border-ink-600 px-2 py-1 text-xs text-ink-300">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "کپی شد" : "کپی"}
                  </button>
                  <button type="button" onClick={applyToActive} className="rounded-lg border border-ink-600 px-2 py-1 text-xs text-ink-300">اعمال به بخش فعال</button>
                </>
              )}
            </div>
          </div>
          <pre className="flex-1 whitespace-pre-wrap rounded-xl bg-ink-950/60 p-4 text-sm leading-8 text-sand-50" dir="auto">
            {output || (loading ? "…" : "خروجی اینجا می‌آید. متن اصلی‌ات خودکار جایگزین نمی‌شود.")}
          </pre>
          {directions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink-400">جهت‌های خلاقانه — یکی را انتخاب کن:</p>
              {directions.map((d, i) => (
                <button key={i} type="button" onClick={() => applyDirection(d)} className="block w-full rounded-xl border border-ink-700/60 bg-ink-950/40 p-3 text-start text-xs leading-6 text-sand-100 hover:border-gold-400/30">
                  {d.slice(0, 400)}{d.length > 400 ? "…" : ""}
                </button>
              ))}
            </div>
          )}
          {meta && <p className="mt-2 text-[10px] text-ink-600">{meta}</p>}
        </section>
      </div>
    </div>
  );
}
