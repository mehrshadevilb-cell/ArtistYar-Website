"use client";

import { MixAnalyzerLab } from "@/components/MixAnalyzerLab";

export default function PracticeAnalyzePage() {
  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <MixAnalyzerLab onBack={() => { window.location.href = "/practice"; }} />
    </main>
  );
}
