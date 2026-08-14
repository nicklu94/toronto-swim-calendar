import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyActivity,
  isWomenOnly,
  normalizePerfectMindEvent,
  parseRichmondHillSchedule,
  parseTimeRanges,
} from "../scripts/lib/regional-schedule.mjs";
import { regionalSchedule, regionalUpdatedDate, regionalVenues } from "../app/regional-schedule-data.ts";

test("classifies York Region activity names", () => {
  assert.equal(classifyActivity("Lane Swim - Older Adult"), "Lane Swim");
  assert.equal(classifyActivity("Deep Water Aquafit"), "Aquafit");
  assert.equal(classifyActivity("Recreational Swim"), "Leisure Swim");
  assert.equal(isWomenOnly("Lane Swim - Women Only"), true);
});

test("parses municipal time ranges", () => {
  assert.deepEqual(parseTimeRanges("7 - 8:15 a.m.; 12 - 1:30 p.m."), [
    { start: "07:00", end: "08:15" },
    { start: "12:00", end: "13:30" },
  ]);
});

test("normalizes a PerfectMind class", () => {
  const event = normalizePerfectMindEvent({
    OccurrenceDate: "20260814",
    EventName: "Lane Swim (Women Only)",
    Location: "Test Pool",
    FormattedStartTime: "7:00 PM",
    FormattedEndTime: "8:00 PM",
    PriceRange: "$5.00",
    EventId: "abc",
  }, {
    origin: "https://example.com",
    prefix: "",
    widgetId: "widget",
    source: "https://example.com/swim",
  }, new Map([["2026-08-14", 0]]));
  assert.equal(event.type, "Lane Swim");
  assert.equal(event.womenOnly, true);
  assert.equal(event.free, false);
  assert.equal(event.start, "19:00");
});

test("parses a Richmond Hill weekly table", () => {
  const html = `<h2>Drop-In Swim Schedule - Summer schedule valid until September 6</h2>
    <div>Test Pool<table><tr><th>Activity</th><th>Sunday</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th></tr>
    <tr><td>Lane Swim</td><td></td><td></td><td></td><td></td><td></td><td>7 - 8:15 a.m.</td><td></td></tr></table></div>`;
  const events = parseRichmondHillSchedule(html, {
    url: "https://example.com",
    heading: /Drop-In Swim Schedule/i,
    defaultType: "Leisure Swim",
  }, ["2026-08-14"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].venue, "Test Pool");
  assert.equal(events[0].type, "Lane Swim");
});

test("keeps each Richmond Hill accordion table under its own pool", () => {
  const inner = (activity) => `<table><tbody><tr><th>Activity</th><th>Sunday</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th></tr><tr><td>${activity}</td><td></td><td></td><td></td><td></td><td></td><td>7 - 8 a.m.</td><td></td></tr></tbody></table>`;
  const html = `<h2>Drop-In Swim Schedule - valid until September 6</h2><table><tbody>
    <tr><th>First Pool</th></tr><tr><td>${inner("Lane Swim")}</td></tr>
    <tr><th>Second Pool</th></tr><tr><td>${inner("Recreational Swim")}</td></tr>
    </tbody></table>`;
  const events = parseRichmondHillSchedule(html, {
    url: "https://example.com",
    heading: /Drop-In Swim Schedule/i,
    defaultType: "Leisure Swim",
  }, ["2026-08-14"]);
  assert.deepEqual(events.map((event) => event.venue), ["First Pool", "Second Pool"]);
});

test("generated seven-day snapshot covers all three York Region cities", () => {
  assert.match(regionalUpdatedDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(regionalSchedule.length > 0);
  assert.deepEqual([...new Set(regionalVenues.map((venue) => venue.district))].sort(), ["Markham", "Richmond Hill", "Vaughan"]);
  assert.ok(regionalSchedule.every((event) => event.day >= 0 && event.day <= 6));
  assert.ok(regionalSchedule.every((event) => regionalVenues.some((venue) => venue.id === event.venue)));
});
