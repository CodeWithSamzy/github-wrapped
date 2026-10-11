import { describe, expect, it } from "vitest";
import {
  FIRST_YEAR,
  WINDOW_DAYS,
  availableYears,
  buildWindow,
  buildYearWindow,
  isWindowCurrent,
  parseYear,
  windowLabel,
  windowYear,
} from "./window";

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

  it("is marked as a rolling window", () => {
    expect(buildWindow().kind).toBe("rolling");
    expect(windowYear(buildWindow())).toBeNull();
    expect(windowLabel(buildWindow())).toBe("Last 12 months");
  });
});

describe("buildYearWindow", () => {
  it("covers January 1st through December 31st in UTC", () => {
    const window = buildYearWindow(2024);
    expect(window).toEqual({
      from: "2024-01-01T00:00:00.000Z",
      to: "2024-12-31T23:59:59.000Z",
      kind: "year",
    });
  });

  it("stays inside GitHub's one-year contribution limit, leap years included", () => {
    const span = Date.parse(buildYearWindow(2024).to) - Date.parse(buildYearWindow(2024).from);
    expect(span).toBeLessThan(365 * MS_PER_DAY + MS_PER_DAY);
  });

  it("reports its year and label", () => {
    expect(windowYear(buildYearWindow(2019))).toBe(2019);
    expect(windowLabel(buildYearWindow(2019))).toBe("2019");
  });
});

describe("parseYear", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");

  it("accepts a four-digit year between 2008 and now", () => {
    expect(parseYear("2024", now)).toBe(2024);
    expect(parseYear(" 2011 ", now)).toBe(2011);
    expect(parseYear(String(FIRST_YEAR), now)).toBe(FIRST_YEAR);
    expect(parseYear("2026", now)).toBe(2026);
  });

  it("rejects anything else", () => {
    expect(parseYear(undefined, now)).toBeNull();
    expect(parseYear("", now)).toBeNull();
    expect(parseYear("24", now)).toBeNull();
    expect(parseYear("2024-01", now)).toBeNull();
    expect(parseYear("nope", now)).toBeNull();
    expect(parseYear("2007", now)).toBeNull();
    expect(parseYear("2027", now)).toBeNull();
  });
});

describe("availableYears", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");

  it("counts down from the current year to the year the account was created", () => {
    expect(availableYears("2022-09-16T17:00:04Z", now)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  it("never offers years before GitHub existed", () => {
    expect(availableYears("1999-01-01T00:00:00Z", now).at(-1)).toBe(FIRST_YEAR);
  });

  it("falls back to the current year when the creation date is unusable", () => {
    expect(availableYears(null, now)).toEqual([2026]);
    expect(availableYears("not-a-date", now)).toEqual([2026]);
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

  it("treats a finished calendar year as current forever", () => {
    expect(isWindowCurrent(buildYearWindow(2020), now)).toBe(true);
  });

  it("never treats the year in progress as current", () => {
    expect(isWindowCurrent(buildYearWindow(2026), now)).toBe(false);
  });

  it("rejects unparseable timestamps", () => {
    expect(isWindowCurrent({ from: "nope", to: "nope", kind: "rolling" }, now)).toBe(false);
  });
});