/** Count consecutive calendar days with at least one completed session, ending today or yesterday. */
export function computeStudyStreak(sessionEndDates: (string | null)[]): number {
  const uniqueDays = new Set<string>();

  for (const endedAt of sessionEndDates) {
    if (!endedAt) continue;
    const d = new Date(endedAt);
    if (Number.isNaN(d.getTime())) continue;
    uniqueDays.add(d.toISOString().slice(0, 10));
  }

  if (uniqueDays.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  if (!uniqueDays.has(todayStr) && !uniqueDays.has(yesterdayStr)) return 0;

  let streak = 0;
  const cursor = new Date(uniqueDays.has(todayStr) ? today : yesterday);

  while (uniqueDays.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
