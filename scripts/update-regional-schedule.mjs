import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CITY_CONFIGS,
  RICHMOND_HILL_SOURCES,
  addDays,
  dedupeAndSort,
  normalizePerfectMindEvent,
  nextPerfectMindDate,
  parseRichmondHillSchedule,
  slugify,
  torontoDateKey,
} from "./lib/regional-schedule.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(root, "app", "regional-schedule-data.ts");
const headers = { "user-agent": "Toronto Swim Calendar/1.0 (+https://torontoswim.ca)" };

function cookieFrom(response) {
  return mergeCookies("", response);
}

function mergeCookies(current, response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const jar = new Map(String(current).split(/;\s*/).filter(Boolean).map((item) => {
    const separator = item.indexOf("=");
    return [item.slice(0, separator), item.slice(separator + 1)];
  }));
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
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
  const bodyFields = { ...fields };
  if (bodyFields.token) {
    bodyFields.__RequestVerificationToken = bodyFields.token;
    delete bodyFields.token;
  }
  const body = new URLSearchParams(bodyFields);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      cookie,
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });
  if (!response.ok) throw new Error(`${response.status} ${url}: ${await response.text()}`);
  return { response, data: await response.json() };
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

async function fetchPerfectMind(config, targetDates) {
  const startUrl = `${config.origin}${config.prefix}/Clients/BookMe4?widgetId=${config.widgetId}`;
  const start = await fetchText(startUrl);
  let cookie = cookieFrom(start.response);
  const categoriesResult = await postForm(
    `${config.origin}${config.prefix}/Clients/BookMe4V2/GetCategoriesDataV2?embed=False`,
    { widgetId: config.widgetId, token: tokenFrom(start.text) },
    cookie,
  );
  cookie = mergeCookies(cookie, categoriesResult.response);
  const categories = categoriesResult.data;
  const calendars = calendarCandidates(categories).filter((calendar) => config.calendars.some((pattern) => pattern.test(calendar.name)));
  if (!calendars.length) throw new Error(`${config.district}: no matching swim calendar was found`);

  const events = [];
  const targetStart = [...targetDates][0];
  const targetEnd = [...targetDates].at(-1);
  const toPerfectMindFilterDate = (dateKey) => `${dateKey}T00:00:00.000Z`;
  for (const calendar of calendars) {
    const classesUrl = `${config.origin}${config.prefix}/Clients/BookMe4BookingPages/Classes?calendarId=${calendar.id}&widgetId=${config.widgetId}&embed=False`;
    const page = await fetchText(classesUrl);
    let pageCookie = mergeCookies(cookie, page.response);
    const token = tokenFrom(page.text);
    let after = "";
    let dateString = "";
    const seenPages = new Set();
    for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
      if (dateString && dateString > targetEnd) break;
      const fields = { calendarId: calendar.id, widgetId: config.widgetId, page: String(pageNumber), dateString, token };
      fields["values[0][Name]"] = "Date Range";
      fields["values[0][Value]"] = toPerfectMindFilterDate(targetStart);
      fields["values[0][Value2]"] = toPerfectMindFilterDate(targetEnd);
      fields["values[0][ValueKind]"] = "6";
      if (after) fields.after = after;
      const result = await postForm(
        `${config.origin}${config.prefix}/Clients/BookMe4BookingPagesV2/ClassesV2`,
        fields,
        pageCookie,
      );
      pageCookie = mergeCookies(pageCookie, result.response);
      const data = result.data;
      const classes = data.classes || data.Classes || data.items || data.Items || [];
      if (process.env.DEBUG_REGIONAL) {
        console.log(config.district, calendar.name, {
          pageNumber,
          dateString,
          count: classes.length,
          dates: [...new Set(classes.map((item) => item.OccurrenceDate))],
          maxEnd: data.classesMaxEndDateString || data.ClassesMaxEndDateString || "",
          nextKey: data.nextKey || data.NextKey || "",
        });
      }
      if (classes.length === 0) break;
      const signature = classes.map((item) => `${item.EventId || item.Id || ""}:${item.OccurrenceDate || ""}`).join("|");
      if (seenPages.has(signature)) break;
      seenPages.add(signature);
      for (const item of classes) {
        const event = normalizePerfectMindEvent(item, config, targetDates);
        if (event) events.push(event);
      }
      const followingKey = data.nextKey || data.NextKey || "";
      if (followingKey && followingKey !== after) after = followingKey;
      const followingDate = nextPerfectMindDate(data, classes);
      if (!followingDate || followingDate === dateString) break;
      dateString = followingDate;
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
const targetDates = Array.from({ length: 16 }, (_, index) => addDays(today, index));
const targetDateSet = new Set(targetDates);
const oldSource = await readFile(outputPath, "utf8");
const existingVenues = parseExistingVenues(oldSource);
const events = [];

for (const config of CITY_CONFIGS) {
  const fetched = await fetchPerfectMind(config, targetDateSet);
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
  date: string;
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
