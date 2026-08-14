import test from "node:test";
import assert from "node:assert/strict";
import { addDateKeyDays, buildDisplayWeek } from "../app/schedule-window.ts";

test("builds a rolling seven-day window from an absolute Toronto date", () => {
  const week = buildDisplayWeek("2026-08-17");
  assert.equal(week.rangeLabel, "8/17 — 8/23");
  assert.deepEqual(week.dateKeys, [
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
    "2026-08-23",
  ]);
  assert.deepEqual(week.dayNames, ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]);
  assert.equal(week.todayIndex, 0);
});

test("date-key arithmetic crosses month boundaries", () => {
  assert.equal(addDateKeyDays("2026-08-31", 1), "2026-09-01");
});
