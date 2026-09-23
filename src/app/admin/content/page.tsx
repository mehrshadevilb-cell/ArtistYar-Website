"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, FolderOpen, GraduationCap, LayoutGrid, Home } from "lucide-react";
import MediaPage from "../media/page";
import FreeEducationPage from "../free-education/page";
import EducationPage from "../education/page";
import { HomePageEditor } from "@/components/admin/HomePageEditor";

type TabId = "media" | "free" | "courses" | "homepage";

const TABS: { id: TabId; label: string; hint: string; icon: typeof FolderOpen }[] = [
  { id: "homepage", label: "صفحه اصلی", hint: "نمایش · ترتیب · متن بخش‌ها", icon: Home },
  { id: "media", label: "رسانه و گالری", hint: "نمونه‌کار · ProdBy · فایل‌های عمومی", icon: FolderOpen },
  { id: "free", label: "آموزش رایگان", hint: "ویدیو، فصل، انتشار عمومی", icon: BookOpen },
  { id: "courses", label: "دوره‌های آموزشی", hint: "اتصال ویدیو به Course / Lesson", icon: GraduationCap },
];

function tabFromQuery(raw: string | null): TabId {
  const v = (raw || "").toLowerCase().trim();
  if (v === "homepage" || v === "home") return "homepage";
  if (v === "free" || v === "free-education" || v === "videos" || v === "video") return "free";
  if (v === "courses" || v === "education" || v === "course") return "courses";
  if (v === "media") return "media";
  return "homepage";
}

function ContentHubInner() {
  const search = useSearchParams();
  const router = useRouter();
  const initial = useMemo(() => tabFromQuery(search.get("tab")), [search]);
  const [tab, setTab] = useState<TabId>(initial);

  useEffect(() => {
    setTab(tabFromQuery(search.get("tab")));
  }, [search]);

  function select(id: TabId) {
    setTab(id);
    const url = id === "homepage" ? "/admin/content" : `/admin/content?tab=${id}`;
    router.replace(url, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">/ مرکز محتوا</p>
        <h2 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-sand-50">
          <LayoutGrid size={22} className="text-gold-400" />
          مدیریت محتوا
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-400">
          صفحه اصلی، رسانه، آموزش رایگان و ویدیوهای دوره در یک پنل.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              className={`flex min-w-[140px] flex-col rounded-2xl border px-4 py-3 text-right transition ${
                active
                  ? "border-gold-400/40 bg-gold-400/10 text-gold-200"
                  : "border-white/10 bg-black/10 text-ink-400 hover:border-white/20 hover:text-sand-50"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon size={16} />
                {t.label}
              </span>
              <span className="mt-1 text-[11px] opacity-70">{t.hint}</span>
            </button>
          );
        })}
      </nav>

      {tab === "homepage" ? <HomePageEditor /> : null}
      {tab === "media" ? <MediaPage /> : null}
      {tab === "free" ? <FreeEducationPage /> : null}
      {tab === "courses" ? <EducationPage /> : null}
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-400">بارگذاری…</p>}>
      <ContentHubInner />
    </Suspense>
  );
}
