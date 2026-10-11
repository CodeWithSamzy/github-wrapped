import type {
  CalendarDay,
  ContributionTotals,
  LanguageShare,
  MonthBucket,
  RankedRepository,
  Streak,
  WeekdayBucket,
  Wrapped,
  WrappedStats,
  WrappedWindowKind,
} from "./types";

export const WRAPPED_VERSION = 2;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);

const WINDOW_KINDS: readonly WrappedWindowKind[] = ["rolling", "year"];
const isWindowKind = (value: unknown): value is WrappedWindowKind =>
  isString(value) && (WINDOW_KINDS as readonly string[]).includes(value);

function isTotals(value: unknown): value is ContributionTotals {
  return (
    isRecord(value) &&
    isFiniteNumber(value.contributions) &&
    isFiniteNumber(value.commits) &&
    isFiniteNumber(value.pullRequests) &&
    isFiniteNumber(value.issues) &&
    isFiniteNumber(value.reviews) &&
    isFiniteNumber(value.restricted)
  );
}

function isStreak(value: unknown): value is Streak {
  return isRecord(value) && isString(value.start) && isString(value.end) && isFiniteNumber(value.days);
}

function isCalendarDay(value: unknown): value is CalendarDay {
  return isRecord(value) && isString(value.date) && isFiniteNumber(value.weekday) && isFiniteNumber(value.count);
}

function isMonthBucket(value: unknown): value is MonthBucket {
  return isRecord(value) && isString(value.month) && isFiniteNumber(value.count);
}

function isWeekdayBucket(value: unknown): value is WeekdayBucket {
  return isRecord(value) && isFiniteNumber(value.weekday) && isFiniteNumber(value.count);
}

function isLanguageShare(value: unknown): value is LanguageShare {
  return (
    isRecord(value) &&
    isString(value.name) &&
    isNullableString(value.color) &&
    isFiniteNumber(value.bytes) &&
    isFiniteNumber(value.percent)
  );
}

function isRankedRepository(value: unknown): value is RankedRepository {
  return (
    isRecord(value) &&
    isString(value.nameWithOwner) &&
    isFiniteNumber(value.commits) &&
    isFiniteNumber(value.stars)
  );
}

function isStats(value: unknown): value is WrappedStats {
  if (!isRecord(value)) return false;
  return (
    isTotals(value.totals) &&
    isFiniteNumber(value.activeDays) &&
    isFiniteNumber(value.trackedDays) &&
    (value.busiestMonth === null || isMonthBucket(value.busiestMonth)) &&
    (value.busiestWeekday === null || isWeekdayBucket(value.busiestWeekday)) &&
    Array.isArray(value.months) &&
    value.months.every(isMonthBucket) &&
    Array.isArray(value.weekdays) &&
    value.weekdays.every(isWeekdayBucket) &&
    (value.longestStreak === null || isStreak(value.longestStreak)) &&
    (value.currentStreak === null || isStreak(value.currentStreak)) &&
    Array.isArray(value.days) &&
    value.days.every(isCalendarDay) &&
    isFiniteNumber(value.languageBytes) &&
    Array.isArray(value.languages) &&
    value.languages.every(isLanguageShare) &&
    Array.isArray(value.topRepositories) &&
    value.topRepositories.every(isRankedRepository) &&
    isFiniteNumber(value.stars) &&
    isFiniteNumber(value.followers) &&
    isFiniteNumber(value.ownedRepositories)
  );
}

/**
 * Structural validation for snapshots coming back out of storage.
 *
 * Snapshots are data we wrote ourselves, but they cross a process boundary
 * (database, HTTP cache) and may be produced by an older deploy. A shape check
 * turns "the whole page throws" into "cache miss, recompute".
 */
export function parseWrapped(value: unknown): Wrapped | null {
  if (!isRecord(value)) return null;
  if (value.version !== WRAPPED_VERSION) return null;
  if (!isRecord(value.profile)) return null;
  if (!isString(value.profile.username) || !isNullableString(value.profile.name) || !isString(value.profile.avatarUrl)) {
    return null;
  }
  if (!isString(value.profile.createdAt)) return null;
  if (!isRecord(value.window) || !isString(value.window.from) || !isString(value.window.to)) return null;
  if (!isWindowKind(value.window.kind)) return null;
  if (!isString(value.generatedAt)) return null;
  if (!isStats(value.stats)) return null;

  return {
    version: WRAPPED_VERSION,
    profile: {
      username: value.profile.username,
      name: value.profile.name,
      avatarUrl: value.profile.avatarUrl,
      createdAt: value.profile.createdAt,
    },
    window: { from: value.window.from, to: value.window.to, kind: value.window.kind },
    generatedAt: value.generatedAt,
    stats: value.stats,
  };
}

export function parseWrappedJson(json: string): Wrapped | null {
  try {
    return parseWrapped(JSON.parse(json));
  } catch {
    return null;
  }
}