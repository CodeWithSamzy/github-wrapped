import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE_COLOR,
  LANGUAGE_LIMIT,
  REPOSITORY_LIMIT,
  busiestMonth,
  busiestWeekday,
  computeStats,
  currentStreak,
  dayOrdinal,
  heatmapColumns,
  intensityLevel,
  languageBreakdown,
  longestStreak,
  monthlyTotals,
  parseUtcDay,
  shiftDay,
  starsReceived,
  topRepositories,
  weekdayOf,
  weekdayTotals,
} from "./stats";
import type { CalendarDay, LanguageInput, RepoInput, WrappedInput } from "./types";

const day = (date: string, count: number): CalendarDay => ({ date, weekday: weekdayOf(date), count });

/** A contiguous run of days starting at `start`, one count per day. */
function run(start: string, counts: number[]): CalendarDay[] {
  return counts.map((count, index) => day(shiftDay(start, index), count));
}

function repo(nameWithOwner: string, overrides: Partial<RepoInput> = {}): RepoInput {
  return { nameWithOwner, commits: 0, stars: 0, isFork: false, languages: [], ...overrides };
}

const lang = (name: string, bytes: number, color: string | null = null): LanguageInput => ({ name, color, bytes });

describe("parseUtcDay", () => {
  it("round-trips a valid calendar date", () => {
    expect(parseUtcDay("2026-03-01")).toBe(Date.UTC(2026, 2, 1));
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseUtcDay("2026-02-30")).toThrow();
    expect(() => parseUtcDay("2026-13-01")).toThrow();
    expect(() => parseUtcDay("2026-3-1")).toThrow();
    expect(() => parseUtcDay("not-a-date")).toThrow();
  });
});

describe("day math", () => {
  it("treats consecutive calendar days as consecutive ordinals", () => {
    expect(dayOrdinal("2026-03-02") - dayOrdinal("2026-03-01")).toBe(1);
  });

  it("rolls over month boundaries", () => {
    expect(shiftDay("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("derives the UTC weekday", () => {
    expect(weekdayOf("2026-01-01")).toBe(4);
  });
});

describe("longestStreak", () => {
  it("returns null when there is no activity", () => {
    expect(longestStreak([])).toBeNull();
    expect(longestStreak(run("2026-03-01", [0, 0, 0]))).toBeNull();
  });

  it("measures the longest consecutive run", () => {
    expect(longestStreak(run("2026-03-01", [1, 2, 3, 0, 4, 5]))).toEqual({
      start: "2026-03-01",
      end: "2026-03-03",
      days: 3,
    });
  });

  it("keeps the earliest run on a tie", () => {
    expect(longestStreak(run("2026-03-01", [1, 1, 0, 1, 1]))?.start).toBe("2026-03-01");
  });

  it("spans month boundaries", () => {
    expect(longestStreak(run("2026-02-26", [1, 1, 1, 1]))).toEqual({
      start: "2026-02-26",
      end: "2026-03-01",
      days: 4,
    });
  });

  it("breaks on a missing calendar day", () => {
    const days = [day("2026-03-01", 1), day("2026-03-05", 1)];
    expect(longestStreak(days)).toEqual({ start: "2026-03-01", end: "2026-03-01", days: 1 });
  });

  it("does not care about input order", () => {
    expect(longestStreak([...run("2026-03-01", [1, 1, 1])].reverse())?.days).toBe(3);
  });
});

describe("currentStreak", () => {
  it("ignores a trailing day with no contributions", () => {
    expect(currentStreak(run("2026-03-01", [1, 1, 1, 0]))).toEqual({
      start: "2026-03-01",
      end: "2026-03-03",
      days: 3,
    });
  });

  it("counts a run that ends on the final day", () => {
    expect(currentStreak(run("2026-03-01", [1, 1]))?.days).toBe(2);
  });

  it("returns null when the window ends with two quiet days", () => {
    expect(currentStreak(run("2026-03-01", [1, 1, 0, 0]))).toBeNull();
  });

  it("returns null when nothing happened", () => {
    expect(currentStreak(run("2026-03-01", [0, 0]))).toBeNull();
    expect(currentStreak([])).toBeNull();
  });
});

describe("monthlyTotals", () => {
  it("totals contributions per month, oldest first", () => {
    const days = [day("2026-04-02", 5), day("2026-03-30", 1), day("2026-03-31", 2)];
    expect(monthlyTotals(days)).toEqual([
      { month: "2026-03", count: 3 },
      { month: "2026-04", count: 5 },
    ]);
  });
});

describe("busiestMonth", () => {
  it("picks the month with the most contributions", () => {
    const days = [day("2026-03-15", 4), day("2026-04-15", 4), day("2026-05-15", 9)];
    expect(busiestMonth(days)).toEqual({ month: "2026-05", count: 9 });
  });

  it("resolves ties to the earliest month", () => {
    expect(busiestMonth([day("2026-03-15", 4), day("2026-04-15", 4)])).toEqual({ month: "2026-03", count: 4 });
  });

  it("returns null for an empty series", () => {
    expect(busiestMonth([])).toBeNull();
  });
});

describe("weekdayTotals", () => {
  it("always returns seven buckets, summed by weekday", () => {
    const totals = weekdayTotals([day("2026-03-01", 3), day("2026-03-08", 2), day("2026-03-02", 5)]);
    expect(totals).toHaveLength(7);
    expect(totals[0]).toEqual({ weekday: 0, count: 5 });
    expect(totals[1]).toEqual({ weekday: 1, count: 5 });
  });
});

describe("busiestWeekday", () => {
  it("returns null when every weekday is quiet", () => {
    expect(busiestWeekday(run("2026-03-01", [0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it("finds the busiest weekday", () => {
    expect(busiestWeekday([day("2026-03-02", 4), day("2026-03-03", 9)])).toEqual({ weekday: 2, count: 9 });
  });
});

describe("languageBreakdown", () => {
  it("converts byte totals into percentages", () => {
    const { totalBytes, languages } = languageBreakdown([
      repo("a/one", { languages: [lang("TypeScript", 300, "#3178c6"), lang("CSS", 100, "#563d7c")] }),
      repo("a/two", { languages: [lang("TypeScript", 100, "#3178c6")] }),
    ]);

    expect(totalBytes).toBe(500);
    expect(languages).toEqual([
      { name: "TypeScript", color: "#3178c6", bytes: 400, percent: 80 },
      { name: "CSS", color: "#563d7c", bytes: 100, percent: 20 },
    ]);
  });

  it("folds everything past the limit into Other", () => {
    const repos = [
      repo("a/one", {
        languages: [lang("A", 10), lang("B", 9), lang("C", 8), lang("D", 7), lang("E", 6), lang("F", 5), lang("G", 4)],
      }),
    ];
    const { languages } = languageBreakdown(repos);
    expect(languages).toHaveLength(LANGUAGE_LIMIT + 1);
    expect(languages.at(-1)).toMatchObject({ name: "Other", bytes: 4 });
  });

  it("ignores empty input and falls back to the default colour", () => {
    expect(languageBreakdown([])).toEqual({ totalBytes: 0, languages: [] });
    expect(languageBreakdown([repo("a/one", { languages: [lang("Go", 0)] })])).toEqual({
      totalBytes: 0,
      languages: [],
    });

    const { languages } = languageBreakdown([repo("a/one", { languages: [lang("Go", 10)] })]);
    expect(languages[0]?.color).toBe(DEFAULT_LANGUAGE_COLOR);
  });
});

describe("topRepositories", () => {
  it("ranks by the user's commits and drops repositories with none", () => {
    const repos = [
      repo("a/quiet", { commits: 0 }),
      repo("a/tie-b", { commits: 3 }),
      repo("a/tie-a", { commits: 3 }),
      repo("a/busy", { commits: 9 }),
    ];
    expect(topRepositories(repos).map((entry) => entry.nameWithOwner)).toEqual(["a/busy", "a/tie-a", "a/tie-b"]);
  });

  it("respects the configured limit", () => {
    const repos = Array.from({ length: 8 }, (_, index) => repo(`a/r${index}`, { commits: index + 1 }));
    expect(topRepositories(repos)).toHaveLength(REPOSITORY_LIMIT);
  });
});

describe("starsReceived", () => {
  it("counts stars only from non-fork repositories", () => {
    expect(starsReceived([repo("a/one", { stars: 10 }), repo("a/fork", { stars: 50, isFork: true })])).toBe(10);
  });
});

describe("intensityLevel", () => {
  it("maps a count onto one of five shades", () => {
    expect(intensityLevel(0, 100)).toBe(0);
    expect(intensityLevel(100, 0)).toBe(0);
    expect(intensityLevel(25, 100)).toBe(1);
    expect(intensityLevel(26, 100)).toBe(2);
    expect(intensityLevel(50, 100)).toBe(2);
    expect(intensityLevel(51, 100)).toBe(3);
    expect(intensityLevel(75, 100)).toBe(3);
    expect(intensityLevel(76, 100)).toBe(4);
    expect(intensityLevel(100, 100)).toBe(4);
  });
});

describe("heatmapColumns", () => {
  it("starts a fresh column when the first day is a Sunday", () => {
    const columns = heatmapColumns(run("2026-03-01", new Array(14).fill(1)));
    expect(columns).toHaveLength(2);
    expect(columns.every((column) => column.length === 7)).toBe(true);
    expect(columns[0]?.every((cell) => cell !== null)).toBe(true);
  });

  it("pads the weekdays before the first day with nulls", () => {
    const columns = heatmapColumns(run("2026-01-01", new Array(3).fill(1)));
    expect(columns[0]?.slice(0, 4).every((cell) => cell === null)).toBe(true);
    expect(columns[0]?.slice(4, 7).every((cell) => cell !== null)).toBe(true);
  });

  it("keeps every real day exactly once, in order", () => {
    const days = run("2026-01-01", new Array(30).fill(1));
    const cells = heatmapColumns(days)
      .flat()
      .filter((cell): cell is CalendarDay => cell !== null);
    expect(cells).toHaveLength(30);
    expect(cells.map((cell) => cell.date)).toEqual(days.map((entry) => entry.date));
  });

  it("returns nothing for an empty series", () => {
    expect(heatmapColumns([])).toEqual([]);
  });
});

describe("computeStats", () => {
  const input: WrappedInput = {
    username: "octocat",
    name: "The Octocat",
    avatarUrl: "https://example.com/avatar.png",
    followers: 42,
    ownedRepositories: 7,
    stars: 1234,
    totals: { contributions: 10, commits: 4, pullRequests: 1, issues: 2, reviews: 3, restricted: 1 },
    days: [day("2026-03-02", 4), day("2026-03-01", 0), day("2026-03-03", 6)],
    repos: [repo("octo/hello", { commits: 6, stars: 5, languages: [lang("Go", 10, "#00ADD8")] })],
  };

  it("summarises the window", () => {
    const stats = computeStats(input);

    expect(stats.activeDays).toBe(2);
    expect(stats.trackedDays).toBe(3);
    expect(stats.totals).toEqual(input.totals);
    expect(stats.stars).toBe(1234);
    expect(stats.followers).toBe(42);
    expect(stats.ownedRepositories).toBe(7);
    expect(stats.longestStreak).toEqual({ start: "2026-03-02", end: "2026-03-03", days: 2 });
    expect(stats.currentStreak).toEqual({ start: "2026-03-02", end: "2026-03-03", days: 2 });
    expect(stats.busiestMonth).toEqual({ month: "2026-03", count: 10 });
    expect(stats.languages[0]?.name).toBe("Go");
  });

  it("sorts the daily series", () => {
    expect(computeStats(input).days.map((entry) => entry.date)).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
  });
});
