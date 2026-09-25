/** UTC day streak helpers. */
export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function nextStreak(prevDay: string | null, prevCount: number, today = utcDayKey()): number {
  if (!prevDay) return 1;
  if (prevDay === today) return prevCount;
  const prev = new Date(prevDay + "T00:00:00Z");
  const cur = new Date(today + "T00:00:00Z");
  const diff = (cur.getTime() - prev.getTime()) / 86400000;
  if (diff === 1) return prevCount + 1;
  return 1;
}
