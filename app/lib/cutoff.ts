export function computeCutoff(now = new Date(), cutoffHour = 15) {
  const before = now.getHours() < cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() === 0);
  const result = before ? "same-day" : "next-day";
  const d = new Date(now);
  if (!before) d.setDate(d.getDate() + 1);
  return { result, dispatchTarget: d.toISOString().slice(0, 10) };
}
