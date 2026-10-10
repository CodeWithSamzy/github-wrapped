const numberFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** `12345` -> `"12,345"` */
export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

/** `12345` -> `"12.3K"`. Good for tight card layouts. */
export function formatCompact(value: number): string {
  return compactFormatter.format(Math.round(value));
}

/** `"2026-03"` -> `"March 2026"`. */
export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-");
  const index = Number(monthIndex) - 1;
  const name = MONTH_NAMES[index];
  return name && year ? `${name} ${year}` : month;
}

/** `"2026-03"` -> `"Mar"`. */
export function formatMonthShort(month: string): string {
  const index = Number(month.split("-")[1]) - 1;
  return MONTH_NAMES[index]?.slice(0, 3) ?? month;
}

/** `"2026-03-14"` -> `"Mar 14, 2026"`. */
export function formatDay(date: string): string {
  const [year, month, day] = date.split("-");
  const name = MONTH_NAMES[Number(month) - 1];
  return name && year && day ? `${name.slice(0, 3)} ${Number(day)}, ${year}` : date;
}

/** `"2025-10-09"` + `"2026-10-07"` -> `"Oct 9, 2025 - Oct 7, 2026"`. */
export function formatRange(from: string, to: string): string {
  return `${formatDay(from.slice(0, 10))} - ${formatDay(to.slice(0, 10))}`;
}

/** `34.219` -> `"34.2%"`. */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatWeekday(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "Unknown";
}

/** `"2026-03-14"` -> `"Saturday"`. */
export function weekdayNameForDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : formatWeekday(parsed.getUTCDay());
}

/** `731` -> `"2 years"`, `1` -> `"1 day"`. */
export function pluralizeDays(days: number): string {
  return days === 1 ? "1 day" : `${formatNumber(days)} days`;
}

export const SLIDE_LABELS = [
  "Intro",
  "Contributions",
  "Busiest month",
  "Busiest weekday",
  "Streak",
  "Languages",
  "Repositories",
  "Community",
  "Share",
] as const;
