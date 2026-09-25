import { CURRENT_TOP_100, HITNEVIS_CHART_DATE, HITNEVIS_CHART_SOURCE } from "./current-chart";

export function getCurrentChartContext(): string {
  const rows = CURRENT_TOP_100;
  const avgTitleWords =
    rows.reduce((sum, row) => sum + row.title.trim().split(/\s+/).length, 0) / rows.length;
  const oneWordTitleRate =
    rows.filter((row) => row.title.trim().split(/\s+/).length === 1).length / rows.length;
  const artists = new Map<string, number>();
  for (const row of rows) artists.set(row.artist, (artists.get(row.artist) || 0) + 1);
  const frequentArtists = [...artists.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return [
    `روند بازار عمومی: snapshot ${HITNEVIS_CHART_DATE} از ${rows.length} قطعهٔ Top 100 (${HITNEVIS_CHART_SOURCE}).`,
    `میانگین طول عنوان ${Math.round(avgTitleWords * 10) / 10} واژه؛ سهم عنوان تک‌واژه‌ای ${Math.round(oneWordTitleRate * 100)}٪.`,
    frequentArtists.length
      ? `تمرکز تکرار هنرمندان در این 100 قطعه: ${frequentArtists.map(([name, count]) => `${name}=${count}`).join("، ")}.`
      : "",
    "از این داده فقط برای تشخیص روند و انتخاب زاویه استفاده کن؛ متن، مصرع، قافیه یا عبارت ترانه‌های موجود را بازتولید نکن.",
  ].filter(Boolean).join("\n");
}
