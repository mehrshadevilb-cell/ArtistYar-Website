import { CURRENT_TOP_100 } from "./current-chart";
import { getRecentHitCorpusStats, RECENT_TOP_100, RECENT_HIT_CORPUS_DATE, RECENT_HIT_CORPUS_SOURCE } from "./recent-hit-corpus";

export function getCurrentChartContext(): string {
  const rows = CURRENT_TOP_100;
  const recent = RECENT_TOP_100;
  const avgTitleWords = rows.reduce((sum, row) => sum + row.title.trim().split(/\s+/).length, 0) / rows.length;
  const oneWordTitleRate = rows.filter((row) => row.title.trim().split(/\s+/).length === 1).length / rows.length;
  const artists = new Map<string, number>();
  for (const row of recent) artists.set(row.artist, (artists.get(row.artist) || 0) + 1);
  const frequentArtists = [...artists.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recentStats = getRecentHitCorpusStats();

  return [
    `روند بازار عمومی: ${recentStats.songCount} قطعه از دهه ۱۴۰۰، snapshot ${RECENT_HIT_CORPUS_DATE} (${RECENT_HIT_CORPUS_SOURCE}).`,
    `برای مقایسهٔ بازار جاری: Top 100 عمومی ${rows.length} قطعه؛ میانگین طول عنوان ${Math.round(avgTitleWords * 10) / 10} واژه و سهم عنوان تک‌واژه‌ای ${Math.round(oneWordTitleRate * 100)}٪.`,
    frequentArtists.length
      ? `تمرکز تکرار هنرمندان در کورپس اخیر: ${frequentArtists.map(([name, count]) => `${name}=${count}`).join("، ")}.`
      : "",
    "این کورپس «متن ترانه» را ذخیره نمی‌کند. اگر متنِ مجاز/ارائه‌شده توسط کاربر در اختیار تحلیل‌گر باشد، فقط featureهای غیرمتنی مثل ساختار، تکرار، قافیه، prosody و ریسک کلیشه استخراج و نگهداری می‌شوند.",
    "از این داده فقط برای تشخیص روند و انتخاب زاویه استفاده کن؛ متن، مصرع، قافیه یا عبارت ترانه‌های موجود را بازتولید نکن.",
  ].filter(Boolean).join("\n");
}
