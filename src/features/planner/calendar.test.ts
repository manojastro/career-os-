import { describe, it, expect } from "vitest";
import { calendarDays, shiftMonth } from "./calendar";
describe("true calendar month", () => {
  it("includes every day with Monday-based padding across leap and short months", () => {
    expect(calendarDays("2024-02-20")).toContain("2024-02-29");
    expect(calendarDays("2026-02-20")).not.toContain("2026-02-29");
    expect(calendarDays("2026-10-20")).toContain("2026-10-31");
    expect(calendarDays("2026-10-20").length % 7).toBe(0);
  });
  it("moves by calendar months without skipping February from a 31st", () =>
    expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-01"));
});
