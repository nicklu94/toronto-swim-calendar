import test from "node:test";
import assert from "node:assert/strict";
import { regionalSchedule, regionalUpdatedDate } from "../app/regional-schedule-data.ts";
import { schedule, scheduleMetadata } from "../app/schedule-data.ts";
import { addDateKeyDays } from "../app/schedule-window.ts";

test("generated municipal data is stored as a sixteen-day absolute-date cache", () => {
  assert.equal(scheduleMetadata.cacheEnd, addDateKeyDays(scheduleMetadata.cacheStart, 15));
  assert.equal(regionalUpdatedDate, scheduleMetadata.cacheStart);
  for (const event of [...schedule, ...regionalSchedule]) {
    assert.match(event.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(event.date >= scheduleMetadata.cacheStart);
    assert.ok(event.date <= scheduleMetadata.cacheEnd);
    assert.equal("day" in event, false);
  }
});
