import type { WrappedWindow } from "./types";

const MS_PER_DAY = 86_400_000;

/**
 * GitHub rejects a `contributionsCollection` range longer than one year, so we
 * stay comfortably inside it: 364 days back from "now".
 */
export const WINDOW_DAYS = 364;

/** GitHub's contribution graph does not reach back before the site launched. */
export const FIRST_YEAR = 2008;

const YEAR_PATTERN = /^\d{4}$/;

/** The rolling twelve-month window ending now. */
export function buildWindow(now: Date = new Date()): WrappedWindow {
  const to = new Date(now.getTime());
  const from = new Date(to.getTime() - WINDOW_DAYS * MS_PER_DAY);
  return { from: from.toISOString(), to: to.toISOString(), kind: "rolling" };
}

/**
 * One UTC calendar year.
 *
 * A calendar year is always inside GitHub's one-year cap: even a leap year
 * spans 365 days and 23:59:59 from January 1st to December 31st.
 */
export function buildYearWindow(year: number): WrappedWindow {
  return {
    from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 0)).toISOString(),
    kind: "year",
  };
}

/** The calendar year a window covers, or `null` for the rolling window. */
export function windowYear(window: WrappedWindow): number | null {
  if (window.kind !== "year") return null;
  const year = Number(window.to.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

/** `"2024"` for a year window, `"Last 12 months"` for the rolling one. */
export function windowLabel(window: WrappedWindow): string {
  const year = windowYear(window);
  return year === null ? "Last 12 months" : String(year);
}

/** Validates a `[year]` route segment or `?year=` query value. */
export function parseYear(raw: string | null | undefined, now: Date = new Date()): number | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!YEAR_PATTERN.test(value)) return null;
  const year = Number(value);
  return year >= FIRST_YEAR && year <= now.getUTCFullYear() ? year : null;
}

/**
 * Every calendar year worth offering for an account, newest first: from the
 * year the account was created through the current year. Accounts with no
 * usable creation date fall back to the current year.
 */
export function availableYears(createdAt: string | null | undefined, now: Date = new Date()): number[] {
  const current = now.getUTCFullYear();
  const created = createdAt ? Number(createdAt.slice(0, 4)) : Number.NaN;
  const first = Number.isInteger(created) ? Math.max(FIRST_YEAR, created) : current;

  const years: number[] = [];
  for (let year = current; year >= first; year -= 1) years.push(year);
  return years;
}

/** True when a stored window still matches the one we would request today. */
export function isWindowCurrent(window: WrappedWindow, now: Date = new Date(), toleranceDays = 1): boolean {
  const year = windowYear(window);
  // A finished calendar year is immutable; the year in progress is not, so it
  // falls through to the ordinary age check below (which always fails, since
  // its window ends in the future).
  if (year !== null && year < now.getUTCFullYear()) return true;

  const age = now.getTime() - Date.parse(window.to);
  return Number.isFinite(age) && age >= -MS_PER_DAY && age <= toleranceDays * MS_PER_DAY;
}