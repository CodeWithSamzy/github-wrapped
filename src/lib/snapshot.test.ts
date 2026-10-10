import { describe, expect, it } from "vitest";
import { WRAPPED_VERSION, parseWrapped, parseWrappedJson } from "./snapshot";
import type { Wrapped } from "./types";

const wrapped: Wrapped = {
  version: 1,
  profile: { username: "octocat", name: "The Octocat", avatarUrl: "https://example.com/a.png" },
  window: { from: "2025-10-09T00:00:00.000Z", to: "2026-10-08T00:00:00.000Z" },
  generatedAt: "2026-10-08T00:00:00.000Z",
  stats: {
    totals: { contributions: 10, commits: 4, pullRequests: 1, issues: 2, reviews: 3, restricted: 0 },
    activeDays: 2,
    trackedDays: 3,
    busiestMonth: { month: "2026-03", count: 10 },
    busiestWeekday: { weekday: 1, count: 7 },
    months: [{ month: "2026-03", count: 10 }],
    weekdays: [
      { weekday: 0, count: 0 },
      { weekday: 1, count: 7 },
      { weekday: 2, count: 3 },
      { weekday: 3, count: 0 },
      { weekday: 4, count: 0 },
      { weekday: 5, count: 0 },
      { weekday: 6, count: 0 },
    ],
    longestStreak: { start: "2026-03-02", end: "2026-03-03", days: 2 },
    currentStreak: null,
    days: [
      { date: "2026-03-01", weekday: 0, count: 0 },
      { date: "2026-03-02", weekday: 1, count: 4 },
      { date: "2026-03-03", weekday: 2, count: 6 },
    ],
    languageBytes: 10,
    languages: [{ name: "Go", color: "#00ADD8", bytes: 10, percent: 100 }],
    topRepositories: [{ nameWithOwner: "octo/hello", commits: 6, stars: 5 }],
    stars: 5,
    followers: 42,
    ownedRepositories: 7,
  },
};

describe("parseWrapped", () => {
  it("round-trips a complete snapshot", () => {
    expect(parseWrapped(wrapped)).toEqual(wrapped);
  });

  it("rejects a version it does not understand", () => {
    expect(parseWrapped({ ...wrapped, version: 2 })).toBeNull();
  });

  it("rejects payloads missing a required stat", () => {
    const { languageBytes, ...stats } = wrapped.stats;
    void languageBytes;
    expect(parseWrapped({ ...wrapped, stats })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parseWrapped(null)).toBeNull();
    expect(parseWrapped("wrapped")).toBeNull();
    expect(parseWrapped([])).toBeNull();
  });
});

describe("parseWrappedJson", () => {
  it("parses serialised snapshots", () => {
    expect(parseWrappedJson(JSON.stringify(wrapped))).toEqual(wrapped);
  });

  it("returns null for malformed JSON", () => {
    expect(parseWrappedJson("{not json")).toBeNull();
  });
});

describe("WRAPPED_VERSION", () => {
  it("is what parseWrapped validates against", () => {
    expect(WRAPPED_VERSION).toBe(1);
  });
});
