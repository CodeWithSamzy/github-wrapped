/**
 * Domain types for GitHub Wrapped.
 *
 * `WrappedInput` is the normalised, provider-shaped payload. Everything in
 * `stats.ts` operates on it and nothing else, so the aggregation logic is pure
 * and testable without touching the network.
 */

/** One day from GitHub's contribution calendar. `date` is `YYYY-MM-DD` in UTC. */
export type CalendarDay = {
  /** `YYYY-MM-DD`, always UTC. */
  date: string;
  /** 0 = Sunday .. 6 = Saturday, as reported by GitHub. */
  weekday: number;
  count: number;
};

export type LanguageInput = {
  name: string;
  /** Hex colour from GitHub's linguist data. */
  color: string | null;
  bytes: number;
};

export type RepoInput = {
  nameWithOwner: string;
  /** Commits the user authored in this repo inside the window. */
  commits: number;
  /** Total stargazers on the repository. */
  stars: number;
  isFork: boolean;
  languages: LanguageInput[];
};

export type ContributionTotals = {
  /** GitHub's `contributionCalendar.totalContributions`. */
  contributions: number;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  /** Private contributions, exposed only as an aggregate count. */
  restricted: number;
};

export type WrappedInput = {
  username: string;
  name: string | null;
  avatarUrl: string;
  followers: number;
  ownedRepositories: number;
  /** Sum of stargazers across the user's owned, non-fork repositories. */
  stars: number;
  totals: ContributionTotals;
  /** Flattened, date-ordered calendar days covering the whole window. */
  days: CalendarDay[];
  repos: RepoInput[];
};

export type Streak = {
  start: string;
  end: string;
  days: number;
};

export type MonthBucket = {
  /** `YYYY-MM` */
  month: string;
  count: number;
};

export type WeekdayBucket = {
  /** 0 = Sunday .. 6 = Saturday. */
  weekday: number;
  count: number;
};

export type LanguageShare = LanguageInput & {
  /** 0 .. 100, unrounded. */
  percent: number;
};

export type RankedRepository = {
  nameWithOwner: string;
  commits: number;
  stars: number;
};

export type WrappedStats = {
  totals: ContributionTotals;
  /** Distinct UTC days with at least one contribution. */
  activeDays: number;
  /** Distinct UTC days covered by the window. */
  trackedDays: number;
  busiestMonth: MonthBucket | null;
  busiestWeekday: WeekdayBucket | null;
  /** Contribution totals for all 12 months, oldest first. */
  months: MonthBucket[];
  /** Contribution totals per weekday, index 0 = Sunday. */
  weekdays: WeekdayBucket[];
  longestStreak: Streak | null;
  /** Streak running up to the end of the window, if any. */
  currentStreak: Streak | null;
  /** The full date-ordered daily series, so the UI can draw a heatmap. */
  days: CalendarDay[];
  /** Total bytes counted across all languages, for the percentages. */
  languageBytes: number;
  languages: LanguageShare[];
  topRepositories: RankedRepository[];
  stars: number;
  followers: number;
  ownedRepositories: number;
};

export type WrappedWindow = {
  /** ISO 8601 timestamps bounding the queried range. */
  from: string;
  to: string;
};

export type WrappedProfile = {
  username: string;
  name: string | null;
  avatarUrl: string;
};

/** The serialisable artefact stored in Postgres and rendered by the UI. */
export type Wrapped = {
  version: 1;
  profile: WrappedProfile;
  window: WrappedWindow;
  /** ISO timestamp of when the snapshot was computed. */
  generatedAt: string;
  stats: WrappedStats;
};

export type StoredSnapshot = {
  wrapped: Wrapped;
  /** ISO timestamp. */
  capturedAt: string;
  /** ISO timestamp; after this the snapshot is considered stale. */
  expiresAt: string;
};
