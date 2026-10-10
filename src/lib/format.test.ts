import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatDay,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatPercent,
  formatRange,
  formatWeekday,
  pluralizeDays,
  weekdayNameForDate,
} from "./format";

describe("numbers", () => {
  it("groups and compacts large numbers", () => {
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatNumber(1234.6)).toBe("1,235");
    expect(formatCompact(12345)).toBe("12.3K");
  });

  it("formats percentages with a configurable precision", () => {
    expect(formatPercent(34.219)).toBe("34.2%");
    expect(formatPercent(100, 0)).toBe("100%");
  });
});

describe("dates", () => {
  it("formats months", () => {
    expect(formatMonth("2026-03")).toBe("March 2026");
    expect(formatMonthShort("2026-03")).toBe("Mar");
  });

  it("formats days and ranges", () => {
    expect(formatDay("2026-03-14")).toBe("Mar 14, 2026");
    expect(formatRange("2025-10-09", "2026-10-07")).toBe("Oct 9, 2025 - Oct 7, 2026");
  });

  it("derives weekday names from UTC dates", () => {
    expect(formatWeekday(4)).toBe("Thursday");
    expect(weekdayNameForDate("2026-01-01")).toBe("Thursday");
  });

  it("pluralises days", () => {
    expect(pluralizeDays(1)).toBe("1 day");
    expect(pluralizeDays(2)).toBe("2 days");
    expect(pluralizeDays(0)).toBe("0 days");
  });
});
