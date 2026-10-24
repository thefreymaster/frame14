// Time formatting shared by the printer and vacuum pages.

/** A duration sensor's value in minutes, whatever unit it reports. */
export function toMinutes(
  value: number | null,
  unit: string | undefined,
): number | null {
  if (value == null || !isFinite(value)) return null;
  switch (unit) {
    case "d":
      return value * 1440;
    case "h":
      return value * 60;
    case "s":
      return value / 60;
    default:
      return value;
  }
}

/** "1h 12m", "12m"; "—" for nothing. */
export function fmtDuration(minutes: number | null): string {
  if (minutes == null || !isFinite(minutes) || minutes <= 0) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The device's time of day, as the header clock shows it: "3:45 PM". */
export function fmtClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * When something happened, as near as it matters: the time today,
 * "Yesterday", a weekday within the week, else the date.
 */
export function fmtWhen(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return fmtClock(date);
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** "segment_cleaning" → "Segment cleaning". */
export function sentenceCase(s: string): string {
  const words = s.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
