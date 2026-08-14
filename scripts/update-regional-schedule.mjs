import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CITY_CONFIGS,
  RICHMOND_HILL_SOURCES,
  addDays,
  dedupeAndSort,
  normalizePerfectMindEvent,
  parseRichmondHillSchedule,
  slugify,
  torontoDateKey,
} from "./lib/regional-schedule.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(root, "app", "regional-schedule-data.ts");
const headers = { "user-agent": "Toronto Swim Calendar/1.0 (+https://torontoswim.ca)" };

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

function tokenFrom(html) {
  const token = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1]
    || html.match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/)?.[1];
  if (!token) throw new Error("PerfectMind verification token was not found");
  return token.replace(/&amp;/g, "&");
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return { response, text: await response.text() };
}

async function postForm(url, fields, cookie) {
  const body = new URLSearchParams(fields);
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, cookie, "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body,
  });
  if (!response.ok) throw new Error(`${response.status} ${url}: ${await response.text()}`);
  return response.json();
}

function collectObjects(value, result = []) {
  if (!value || typeof value !== "object") return result;
  if (Array.isArray(value)) for (const item of value) collectObjects(item, result);
  else {
    result.push(value);
    for (const child of Object.values(value)) collectObjects(child, result);
  }
  return result;
}

function calendarCandidates(payload) {
  return collectObjects(payload).filter((item) => {
    const name = item.Name || item.CalendarName || item.Title || item.name;
    const id = item.CalendarId || item.Id || item.id;
    return typeof name === "string" && typeof id === "string";
  }).map((item) => ({
    name: item.Name || item.CalendarName || item.Title || item.name,
    id: item.CalendarId || item.Id || item.id,
  }));
}

async function fetchPerfectMind(config, targetDay) {
  const startUrl = `${config.origin}${config.prefix}/Clients/BookMe4?widgetId=${config.widgetId}`;
  const start = await fetchText(startUrl);
  const cookie = cookieFrom(start.response);
  const categories = await postForm(
    `${config.origin}${config.prefix}/Clients/BookMe4V2/GetCategoriesDataV2?embed=False`,
    { widgetId: config.widgetId, token: tokenFrom(start.text) },
    cookie,
  );
  const calendars = calendarCandidates(categories).filter((calendar) => config.calendars.some((pattern) => pattern.test(calendar.name)));
  if (!calendars.length) throw new Error(`${config.district}: no matching swim calendar was found`);

  const events = [];
  for (const calendar of calendars) {
    const classesUrl = `${config.origin}${config.prefix}/Clients/BookMe4BookingPages/Classes?calendarId=${calendar.id}&widgetId=${config.widgetId}&embed=False`;
    const page = await fetchText(classesUrl);
    const pageCookie = cookieFrom(page.response) || cookie;
    const token = tokenFrom(page.text);
    let nextKey = "";
    for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
      const fields = { calendarId: calendar.id, widgetId: config.widgetId, page: String(pageNumber), dateString: "", token };
      if (nextKey) fields.nextKey = nextKey;
      const data = await postForm(
        `${config.origin}${config.prefix}/Clients/BookMe4BookingPagesV2/ClassesV2`,
        fields,
        pageCookie,
      );
      const classes = data.classes || data.Classes || data.items || data.Items || [];
      for (const item of classes) {
        const event = normalizePerfectMindEvent(item, config, targetDay);
        if (event) events.push(event);
      }
      const followingKey = data.nextKey || data.NextKey || "";
      if (!followingKey || followingKey === nextKey || classes.length === 0) break;
      nextKey = followingKey;
    }
  }
  return events;
}

function parseExistingVenues(source) {
  const match = source.match(/export const regionalVenues = (\[[\s\S]*?\n\]);\n\nexport const regionalSchedule/);
  return match ? JSON.parse(match[1]) : [];
}

function buildVenues(existing, events) {
  const byName = new Map(existing.map((venue) => [venue.name.toLowerCase(), venue]));
  return [...new Set(events.map((event) => event.venue))].map((name) => {
    const found = byName.get(name.toLowerCase());
    if (found) return found;
    const district = events.find((event) => event.venue === name).district;
    const config = CITY_CONFIGS.find((item) => item.district === district);
    const fallback = district === "Richmond Hill"
      ? { lat: 43.8828, lng: -79.44, color: "#7a6699", source: RICHMOND_HILL_SOURCES[0].url }
      : { ...config.fallback, source: config.source };
    return {
      id: `regional-${slugify(district)}-${slugify(name)}`,
      name,
      shortName: name.replace(/ Community Centre| Pool and Gymnasium| Pool & Gymnasium/g, ""),
      district,
      ...fallback,
    };
  }).sort((a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name));
}

const today = torontoDateKey();
const targetDates = Array.from({ length: 7 }, (_, index) => addDays(today, index));
const targetDay = new Map(targetDates.map((date, index) => [date, index]));
const oldSource = await readFile(outputPath, "utf8");
const existingVenues = parseExistingVenues(oldSource);
const events = [];

for (const config of CITY_CONFIGS) {
  const fetched = await fetchPerfectMind(config, targetDay);
  events.push(...fetched.map((event) => ({ ...event, district: config.district })));
  console.log(`${config.district}: ${fetched.length} sessions`);
}

for (const source of RICHMOND_HILL_SOURCES) {
  const { text } = await fetchText(source.url);
  const fetched = parseRichmondHillSchedule(text, source, targetDates);
  events.push(...fetched.map((event) => ({ ...event, district: "Richmond Hill" })));
  console.log(`Richmond Hill ${source.defaultType}: ${fetched.length} sessions`);
}

const venues = buildVenues(existingVenues, events);
const venueIds = new Map(venues.map((venue) => [venue.name, venue.id]));
const normalized = dedupeAndSort(events).map((event) => {
  const publicEvent = { ...event };
  publicEvent.venue = venueIds.get(event.venue);
  if (!publicEvent.venue) throw new Error(`No venue id was generated for ${event.venue}`);
  delete publicEvent.district;
  return publicEvent;
});
if (!normalized.length) throw new Error("Regional update returned no sessions");
for (const district of ["Markham", "Richmond Hill", "Vaughan"]) {
  if (!events.some((event) => event.district === district)) throw new Error(`Regional update returned no ${district} sessions`);
}
const output = `export type RegionalEvent = {
  day: number;
  venue: string;
  start: string;
  end: string;
  type: "Leisure Swim" | "Lane Swim" | "Aquafit";
  womenOnly: boolean;
  free: boolean;
  fee: string;
  source: string;
};

// Automatically refreshed from official municipal sources on ${today}.
export const regionalUpdatedDate = ${JSON.stringify(today)};
export const regionalVenues = ${JSON.stringify(venues, null, 2)};

export const regionalSchedule: RegionalEvent[] = ${JSON.stringify(normalized, null, 2)};
`;
await writeFile(outputPath, output, "utf8");
console.log(`Wrote ${normalized.length} York Region sessions across ${venues.length} venues to ${outputPath}`);
