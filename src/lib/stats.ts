import type {
  CalendarDay,
  LanguageShare,
  MonthBucket,
  RankedRepository,
  RepoInput,
  Streak,
  WeekdayBucket,
  WrappedInput,
  WrappedStats,
} from "./types";

const MS_PER_DAY = 86_400_000;

/** Fallback swatch when GitHub has no linguist colour for a language. */
export const DEFAULT_LANGUAGE_COLOR = "#8b949e";

/** Languages shown individually before everything else collapses into "Other". */
export const LANGUAGE_LIMIT = 6;

/** Repositories listed on the "top repositories" slide. */
export const REPOSITORY_LIMIT = 5;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a `YYYY-MM-DD` calendar date into a UTC epoch timestamp.
 * Throws on malformed input rather than silently producing `NaN`, because a
 * bad date here would quietly corrupt every downstream statistic.
 */
export function parseUtcDay(date: string): number {
  const match = DAY_PATTERN.exec(date);
  if (!match) throw new Error(`Invalid calendar date: ${date}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ts = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(ts);
  if (roundTrip.getUTCFullYear() !== year || roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${date}`);
  }
  return ts;
}

/** Whole days since the Unix epoch — the canonical key for "is this day next to that day". */
export function dayOrdinal(date: string): number {
  return Math.round(parseUtcDay(date) / MS_PER_DAY);
}

/** Formats a UTC epoch timestamp back to `YYYY-MM-DD`. */
export function toIsoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Adds (or subtracts) whole days from a `YYYY-MM-DD` string. */
export function shiftDay(date: string, deltaDays: number): string {
  return toIsoDay(parseUtcDay(date) + deltaDays * MS_PER_DAY);
}

/** 0 = Sunday .. 6 = Saturday, derived from the UTC date itself. */
export function weekdayOf(date: string): number {
  return new Date(parseUtcDay(date)).getUTCDay();
}

function sortDays(days: readonly CalendarDay[]): CalendarDay[] {
  return [...days].sort((a, b) => dayOrdinal(a.date) - dayOrdinal(b.date));
}

/**
 * The longest run of consecutive days, each with at least one contribution.
 *
 * Consecutiveness is measured in whole UTC days, so a gap in the calendar
 * (or a missing day from the API) always breaks the streak.
 */
export function longestStreak(days: readonly CalendarDay[]): Streak | null {
  let best: Streak | null = null;
  let runStart: string | null = null;
  let runDays = 0;
  let previousOrdinal: number | null = null;

  for (const day of sortDays(days)) {
    const ordinal = dayOrdinal(day.date);
    const contiguous = previousOrdinal !== null && ordinal === previousOrdinal + 1;

    if (day.count > 0) {
      if (runStart === null || !contiguous) {
        runStart = day.date;
        runDays = 1;
      } else {
        runDays += 1;
      }
      if (best === null || runDays > best.days) {
        best = { start: runStart, end: day.date, days: runDays };
      }
    } else {
      runStart = null;
      runDays = 0;
    }

    previousOrdinal = ordinal;
  }

  return best;
}

/**
 * The streak that runs up to the end of the window.
 *
 * If the final day has no contributions it is ignored (a day is not "missed"
 * until it is over), which mirrors how GitHub describes an active streak.
 */
export function currentStreak(days: readonly CalendarDay[]): Streak | null {
  const ordered = sortDays(days).reverse();
  const first = ordered[0];
  if (!first) return null;

  let cursor = 0;
  if (first.count === 0) cursor = 1;

  const end = ordered[cursor];
  if (!end || end.count === 0) return null;

  let runDays = 0;
  let start = end.date;
  let expected = dayOrdinal(end.date);

  for (let i = cursor; i < ordered.length; i += 1) {
    const day = ordered[i]!;
    if (day.count === 0) break;
    if (dayOrdinal(day.date) !== expected) break;
    start = day.date;
    runDays += 1;
    expected -= 1;
  }

  return { start, end: end.date, days: runDays };
}

/** Total contributions per `YYYY-MM`, oldest first. */
export function monthlyTotals(days: readonly CalendarDay[]): MonthBucket[] {
  const buckets = new Map<string, number>();
  for (const day of sortDays(days)) {
    const month = day.date.slice(0, 7);
    buckets.set(month, (buckets.get(month) ?? 0) + day.count);
  }
  return [...buckets].map(([month, count]) => ({ month, count }));
}

/**
 * The single month with the most contributions.
 * Ties resolve to the earliest month, which keeps output deterministic.
 */
export function busiestMonth(days: readonly CalendarDay[]): MonthBucket | null {
  let best: MonthBucket | null = null;
  for (const bucket of monthlyTotals(days)) {
    if (best === null || bucket.count > best.count) best = bucket;
  }
  return best;
}

/** Contributions grouped by weekday, always returning all seven buckets. */
export function weekdayTotals(days: readonly CalendarDay[]): WeekdayBucket[] {
  const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const day of days) {
    const weekday = weekdayOf(day.date);
    counts[weekday] = (counts[weekday] ?? 0) + day.count;
  }
  return counts.map((count, weekday) => ({ weekday, count }));
}

/**
 * The weekday with the most contributions.
 * Ties resolve to the earliest weekday (Sunday first).
 */
export function busiestWeekday(days: readonly CalendarDay[]): WeekdayBucket | null {
  let best: WeekdayBucket | null = null;
  for (const bucket of weekdayTotals(days)) {
    if (best === null || bucket.count > best.count) best = bucket;
  }
  return best?.count ? best : null;
}

export type LanguageBreakdown = {
  totalBytes: number;
  languages: LanguageShare[];
};

/**
 * Sums language bytes across repositories and converts them to shares.
 *
 * The tail beyond `limit` is folded into a single "Other" bucket so the
 * percentages always add up to 100 (within floating point).
 */
export function languageBreakdown(repos: readonly RepoInput[], limit = LANGUAGE_LIMIT): LanguageBreakdown {
  const totals = new Map<string, { bytes: number; color: string | null }>();

  for (const repo of repos) {
    for (const language of repo.languages) {
      if (language.bytes <= 0) continue;
      const existing = totals.get(language.name);
      if (existing) {
        existing.bytes += language.bytes;
        existing.color ??= language.color;
      } else {
        totals.set(language.name, { bytes: language.bytes, color: language.color });
      }
    }
  }

  const totalBytes = [...totals.values()].reduce((sum, entry) => sum + entry.bytes, 0);
  if (totalBytes === 0) return { totalBytes: 0, languages: [] };

  const ranked = [...totals.entries()].sort((a, b) => b[1].bytes - a[1].bytes || a[0].localeCompare(b[0]));
  const head = ranked.slice(0, limit);
  const tail = ranked.slice(limit);

  const languages: LanguageShare[] = head.map(([name, entry]) => ({
    name,
    color: entry.color ?? DEFAULT_LANGUAGE_COLOR,
    bytes: entry.bytes,
    percent: (entry.bytes / totalBytes) * 100,
  }));

  if (tail.length > 0) {
    const bytes = tail.reduce((sum, [, entry]) => sum + entry.bytes, 0);
    languages.push({
      name: "Other",
      color: DEFAULT_LANGUAGE_COLOR,
      bytes,
      percent: (bytes / totalBytes) * 100,
    });
  }

  return { totalBytes, languages };
}

/** Repositories ranked by the user's own commits inside the window. */
export function topRepositories(repos: readonly RepoInput[], limit = REPOSITORY_LIMIT): RankedRepository[] {
  return [...repos]
    .filter((repo) => repo.commits > 0)
    .sort((a, b) => b.commits - a.commits || a.nameWithOwner.localeCompare(b.nameWithOwner))
    .slice(0, limit)
    .map(({ nameWithOwner, commits, stars }) => ({ nameWithOwner, commits, stars }));
}

/**
 * Lays the daily series out as a GitHub-style calendar grid: columns are weeks,
 * rows are weekdays starting on Sunday. Leading slots before the first day are
 * `null` so the grid stays aligned.
 */
export function heatmapColumns(days: readonly CalendarDay[]): (CalendarDay | null)[][] {
  const ordered = sortDays(days);
  const first = ordered[0];
  if (!first) return [];

  const cells: (CalendarDay | null)[] = new Array<null>(first.weekday).fill(null);
  cells.push(...ordered);

  const columns: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const column = cells.slice(i, i + 7);
    while (column.length < 7) column.push(null);
    columns.push(column);
  }
  return columns;
}

/**
 * Buckets a day's count into 0-4 for the heatmap shading, using quartiles of
 * the observed maximum so a light user still gets a readable gradient.
 */
export function intensityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Total stargazers across the user's owned, non-fork repositories. */
export function starsReceived(repos: readonly RepoInput[]): number {
  return repos.reduce((sum, repo) => (repo.isFork ? sum : sum + repo.stars), 0);
}

/**
 * The single entry point: raw normalised input in, everything the UI renders out.
 * Pure and deterministic — the same input always yields the same output.
 */
export function computeStats(input: WrappedInput): WrappedStats {
  const days = sortDays(input.days);
  const { totalBytes, languages } = languageBreakdown(input.repos);

  return {
    totals: input.totals,
    activeDays: days.filter((day) => day.count > 0).length,
    trackedDays: days.length,
    busiestMonth: busiestMonth(days),
    busiestWeekday: busiestWeekday(days),
    months: monthlyTotals(days),
    weekdays: weekdayTotals(days),
    longestStreak: longestStreak(days),
    currentStreak: currentStreak(days),
    days,
    languageBytes: totalBytes,
    languages,
    topRepositories: topRepositories(input.repos),
    stars: input.stars,
    followers: input.followers,
    ownedRepositories: input.ownedRepositories,
  };
}
