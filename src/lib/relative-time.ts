// Shared relative-time formatter for discussion timestamps ("3 hours ago",
// "in 2 days"). Locale-aware via Intl.RelativeTimeFormat; steps up through the
// largest unit that keeps the number small and readable.
export function relativeTime(iso: string, locale: string): string {
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" });
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (Math.abs(seconds) < 60) return fmt.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return fmt.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return fmt.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return fmt.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return fmt.format(months, "month");
  return fmt.format(Math.round(months / 12), "year");
}
