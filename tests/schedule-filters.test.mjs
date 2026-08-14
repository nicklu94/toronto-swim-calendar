import test from "node:test";
import assert from "node:assert/strict";
import { poolSettingForVenue, sessionContainsTime } from "../app/schedule-filters.ts";

test("keeps sessions that are open at the selected time", () => {
  const session = { start: "10:30", end: "12:00" };
  assert.equal(sessionContainsTime(session, "10:30"), true);
  assert.equal(sessionContainsTime(session, "11:15"), true);
  assert.equal(sessionContainsTime(session, "10:29"), false);
  assert.equal(sessionContainsTime(session, "12:00"), false);
  assert.equal(sessionContainsTime(session, ""), true);
});

test("classifies municipal outdoor pools without changing the schedule cache", () => {
  assert.equal(poolSettingForVenue("maryvale-park"), "outdoor");
  assert.equal(poolSettingForVenue("regional-markham-morgan-pool"), "outdoor");
  assert.equal(poolSettingForVenue("regional-vaughan-thornhill-outdoor-pool"), "outdoor");
  assert.equal(poolSettingForVenue("agincourt-community-recreation-centre"), "indoor");
});
