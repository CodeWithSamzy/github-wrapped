import { describe, expect, it } from "vitest";
import { WINDOW_DAYS, buildWindow, isWindowCurrent } from "./window";

const MS_PER_DAY = 86_400_000;

describe("buildWindow", () => {
  it("spans the configured number of days ending now", () => {
    const now = new Date("2026-10-08T12:00:00.000Z");
    const window = buildWindow(now);
    expect(window.to).toBe(now.toISOString());
    expect(Date.parse(window.to) - Date.parse(window.from)).toBe(WINDOW_DAYS * MS_PER_DAY);
  });

  it("stays inside GitHub's one-year contribution limit", () => {
    expect(WINDOW_DAYS).toBeLessThan(365);
  });
});

describe("isWindowCurrent", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");

  it("accepts a window built moments ago", () => {
    expect(isWindowCurrent(buildWindow(now), now)).toBe(true);
  });

  it("rejects a window older than the tolerance", () => {
    const old = buildWindow(new Date(now.getTime() - 5 * MS_PER_DAY));
    expect(isWindowCurrent(old, now)).toBe(false);
  });

  it("tolerates a window that ends slightly in the future", () => {
    const future = buildWindow(new Date(now.getTime() + 3_600_000));
    expect(isWindowCurrent(future, now)).toBe(true);
  });

  it("rejects unparseable timestamps", () => {
    expect(isWindowCurrent({ from: "nope", to: "nope" }, now)).toBe(false);
  });
});
