import test from "node:test";
import assert from "node:assert/strict";
import { matchesTimeWindow, poolSettingForVenue } from "../app/schedule-filters.ts";

test("filters sessions inside a preferred time window", () => {
  const session = { start: "10:30", end: "12:00" };
  assert.equal(matchesTimeWindow(session, "10:00", "13:00"), true);
  assert.equal(matchesTimeWindow(session, "11:00", "13:00"), false);
  assert.equal(matchesTimeWindow(session, "10:00", "11:30"), false);
  assert.equal(matchesTimeWindow(session, "", ""), true);
  assert.equal(matchesTimeWindow(session, "15:00", "09:00"), false);
});

test("classifies municipal outdoor pools without changing the schedule cache", () => {
  assert.equal(poolSettingForVenue("maryvale-park"), "outdoor");
  assert.equal(poolSettingForVenue("regional-markham-morgan-pool"), "outdoor");
  assert.equal(poolSettingForVenue("regional-vaughan-thornhill-outdoor-pool"), "outdoor");
  assert.equal(poolSettingForVenue("agincourt-community-recreation-centre"), "indoor");
});
