import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CirclePlay,
  Sparkles,
  Waves,
  GraduationCap,
  Plug2,
} from "lucide-react";
import LatestPluginsLive, { type LatestPlugin } from "@/components/plugins/LatestPluginsLive";
import { queryLatestPlugins } from "@/lib/plugins-db";
import { Reveal } from "@/components/Reveal";
import { DepthScene } from "@/components/DepthScene";
import { ScrollDepth } from "@/components/ScrollDepth";
import { HeroActions } from "@/components/HeroActions";
import { SafeLink } from "@/components/SafeLink";
import { CommunityLinks } from "@/components/CommunityLinks";
import { HeroDifferentiator } from "@/components/HeroDifferentiator";
import { ScrollStage } from "@/components/ScrollStage";
import { getHomepageConfig } from "@/lib/homepage";
import { sectionMap } from "@/data/homepage";
import { HomeStudentWorks } from "@/components/HomeStudentWorks";
import { HomeLiveCoursesLazy as HomeLiveCourses } from "@/components/lazy/HomeLiveCoursesLazy";
import { QuickConsultationFormLazy as QuickConsultationForm } from "@/components/lazy/QuickConsultationFormLazy";

export const metadata: Metadata = {
  title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | مهرشاد بنائی",
  description:
    "آکادمی راه‌یار و ArtistYar: آموزش پروژه‌محور تنظیم، میکس و مسترینگ با کلاس آنلاین، پشتیبانی هنرجو، نمونه‌کار واقعی و دستیار هوشمند راه‌یار AI.",
  keywords: [
    "آموزش تنظیم",
    "آموزش میکس",
    "آموزش مسترینگ",
    "مهرشاد بنائی",
    "راه‌یار",
    "راه‌یار AI",
    "دستیار هوش مصنوعی موسیقی",
    "ArtistYar",
    "تولید موسیقی",
    "عیب‌یابی میکس",
    "تنظیم آثار موسیقی",
    "سفارش تنظیم آهنگ",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | ArtistYar",
    description:
      "یادگیری واقعی تولید موسیقی با مسیر روشن، تمرین پروژه‌محور و دستیار هوشمند راه‌یار.",
    type: "website",
    url: "/",
  },
};
