/**
 * Persian lyric mechanics — deterministic, approximate analysis.
 * This is a writing aid, not a substitute for singing against the actual melody.
 */

export type ProsodyLine = {
  line: number;
  text: string;
  syllables: number;
  ending: string;
  rhymeKey: string;
};

export type ProsodyReport = {
  lines: ProsodyLine[];
  averageSyllables: number;
  syllableSpread: number;
  flaggedLines: Array<{ line: number; reason: string }>;
  rhymeGroups: Array<{ key: string; lines: number[] }>;
  repeatedEndWords: string[];
  confidence: "approximate";
};

function normalize(raw: string): string {
  return raw
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[«»“”"()\[\]{}:؛;,.،!?؟…—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function words(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

/**
 * Persian orthography hides short vowels, so exact syllable counting from plain
 * text is impossible in many cases. This heuristic counts vowel nuclei and
 * uses common diphthong/long-vowel patterns; callers must treat the result as
 * approximate and verify by reading/singing.
 */
export function estimatePersianSyllables(word: string): number {
  const w = normalize(word);
  if (!w) return 0;
  const stripped = w.replace(/[^آ-یa-z0-9]/gi, "");
  if (!stripped) return 0;

  const explicit = (stripped.match(/[َُِ]/g) || []).length;
  if (explicit) return Math.max(1, explicit);

  // Long vowels / vowel-bearing graphemes.
  let count = 0;
  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (/[اآ]/.test(ch)) {
      // Final alef/آ is normally a nucleus; alef after certain consonants is too.
      count += 1;
    } else if (/[و]/.test(ch)) {
      // وا/وو/وُ clusters are one nucleus in common words.
      if (i > 0 && /[ا]/.test(stripped[i - 1])) continue;
      count += 1;
    } else if (/[ی]/.test(ch)) {
      if (i > 0 && /[ا]/.test(stripped[i - 1])) continue;
      count += 1;
    } else if (/[aeiou]/i.test(ch)) {
      count += 1;
    }
  }

  // Words without written vowels still contain at least one syllable.
  return Math.max(1, count);
}

export function estimatePersianTextSyllables(text: string): number {
  return words(text).reduce((sum, word) => sum + estimatePersianSyllables(word), 0);
}

function rhymeKey(word: string): string {
  const w = normalize(word);
  if (!w) return "";
  // Strip frequent grammatical endings so identical stems do not look like
  // different rhyme families merely because of a suffix.
  const stem = w
    .replace(/(های|ها|تر|ترین|م|ت|ش|مون|تون|شون)$/u, "")
    .replace(/ه$/u, "");
  return (stem || w).slice(-3);
}

function endingOf(line: string): string {
  const ws = words(line);
  return ws[ws.length - 1] || "";
}

export function analyzeProsody(raw: string): ProsodyReport {
  const rawLines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const lines = rawLines.map((text, index) => {
    const ending = endingOf(text);
    return {
      line: index + 1,
      text,
      syllables: estimatePersianTextSyllables(text),
      ending,
      rhymeKey: rhymeKey(ending),
    };
  });

  const counts = lines.map((x) => x.syllables);
  const averageSyllables = counts.length
    ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10
    : 0;
  const syllableSpread = counts.length
    ? Math.max(...counts) - Math.min(...counts)
    : 0;

  const flaggedLines: ProsodyReport["flaggedLines"] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const prev = lines[i - 1];
    const next = lines[i + 1];
    if (prev && Math.abs(lines[i].syllables - prev.syllables) >= 5) {
      flaggedLines.push({ line: lines[i].line, reason: "طول هجایی این خط با خط قبل اختلاف زیادی دارد." });
    }
    if (next && Math.abs(lines[i].syllables - next.syllables) >= 5) {
      flaggedLines.push({ line: lines[i].line, reason: "طول هجایی این خط با خط بعد اختلاف زیادی دارد." });
    }
    if (lines[i].syllables >= 15) {
      flaggedLines.push({ line: lines[i].line, reason: "خط بلند است؛ احتمال نفس‌گیری یا فشردگی روی ملودی وجود دارد." });
    }
  }

  const groups = new Map<string, number[]>();
  for (const line of lines) {
    if (!line.rhymeKey) continue;
    const arr = groups.get(line.rhymeKey) || [];
    arr.push(line.line);
    groups.set(line.rhymeKey, arr);
  }

  const rhymeGroups = [...groups.entries()]
    .filter(([, nums]) => nums.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .map(([key, nums]) => ({ key, lines: nums }));

  const endCounts = new Map<string, number>();
  for (const line of lines) {
    if (line.ending) endCounts.set(line.ending, (endCounts.get(line.ending) || 0) + 1);
  }
  const repeatedEndWords = [...endCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([word]) => word)
    .slice(0, 12);

  return {
    lines,
    averageSyllables,
    syllableSpread,
    flaggedLines: flaggedLines.slice(0, 16),
    rhymeGroups,
    repeatedEndWords,
    confidence: "approximate",
  };
}

export function formatProsodyReport(report: ProsodyReport): string {
  const lines = [
    "🎵 تحلیل وزن/ریتم تقریبی",
    `میانگین هجا در خط: ${report.averageSyllables}`,
    `دامنه اختلاف خطوط: ${report.syllableSpread} هجا`,
  ];
  if (report.flaggedLines.length) {
    lines.push("", "خط‌های مشکوک:");
    for (const item of report.flaggedLines.slice(0, 8)) {
      lines.push(`• خط ${item.line}: ${item.reason}`);
    }
  }
  if (report.rhymeGroups.length) {
    lines.push("", "خانواده‌های قافیه:");
    for (const group of report.rhymeGroups.slice(0, 6)) {
      lines.push(`• ${group.key}: خطوط ${group.lines.join("، ")}`);
    }
  }
  if (report.repeatedEndWords.length) {
    lines.push("", "پایان‌واژه‌های تکراری:");
    lines.push("• " + report.repeatedEndWords.join("، "));
  }
  lines.push("", "توجه: شمارش هجا از متن نوشتاری فارسی تقریبی است؛ برای تأیید نهایی باید متن با ملودی خوانده شود.");
  return lines.join("\n");
}
