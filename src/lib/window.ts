import type { WrappedWindow } from "./types";

const MS_PER_DAY = 86_400_000;

/**
 * GitHub rejects a `contributionsCollection` range longer than one year, so we
 * stay comfortably inside it: 364 days back from "now".
 */
export const WINDOW_DAYS = 364;

/** The rolling twelve-month window ending now. */
export function buildWindow(now: Date = new Date()): WrappedWindow {
  const to = new Date(now.getTime());
  const from = new Date(to.getTime() - WINDOW_DAYS * MS_PER_DAY);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** True when a stored window still matches the one we would request today. */
export function isWindowCurrent(window: WrappedWindow, now: Date = new Date(), toleranceDays = 1): boolean {
  const age = now.getTime() - Date.parse(window.to);
  return Number.isFinite(age) && age >= -MS_PER_DAY && age <= toleranceDays * MS_PER_DAY;
}
