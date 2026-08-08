import { writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cityApi = "https://www.toronto.ca/data/parks/live/locations";
const locationPage = "https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/parks-and-recreation-facilities/location/";
const districts = new Set(["North York", "Scarborough"]);

function decodeJson(buffer) {
  const bytes = new Uint8Array(buffer);
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe;
  return JSON.parse(new TextDecoder(utf16 ? "utf-16le" : "utf-8").decode(bytes).replace(/^\uFEFF/, ""));
}

async function getJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "Toronto Swim Weekly/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return decodeJson(await response.arrayBuffer());
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function to24Hour(value) {
  const match = value.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!match) throw new Error(`Cannot parse time: ${value}`);
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

const arcgis = new URL("https://gis.toronto.ca/arcgis/rest/services/cot_geospatial13/FeatureServer/77/query");
arcgis.search = new URLSearchParams({
  where: "TYPE='Community Centre' AND DISTRICT_CCA IN ('North York','Scarborough')",
  outFields: "LOCATIONID,ASSET_NAME,DISTRICT_CCA",
  returnGeometry: "false",
  f: "json",
});

const gis = await getJson(arcgis);
const candidates = gis.features.map(({ attributes }) => ({
  id: String(attributes.LOCATIONID),
  district: attributes.DISTRICT_CCA,
}));
candidates.push({ id: "704", district: "Scarborough" });

const verified = [];
for (const candidate of candidates) {
  try {
    const [info, swim] = await Promise.all([
      getJson(`${cityApi}/${candidate.id}/info.json`),
      getJson(`${cityApi}/${candidate.id}/swim/info.json`),
    ]);
    if (districts.has(info.district) && swim.weeks?.[0]) verified.push({ ...candidate, info, swim });
  } catch {
    // A community centre without a swimming feed is outside this calendar's scope.
  }
}

const cityVenues = verified
  .map(({ id, info }) => ({
    id: slugify(info.title) || `location-${id}`,
    locationId: id,
    name: info.title,
    shortName: info.title
      .replace(/ Community Recreation Centre| Community Centre| Recreation Centre| Community Recreation Centre & Library| Collegiate Institute| Swimming Pool/gi, "")
      .replace(/ - Scarborough$/i, "")
      .trim(),
    district: info.district,
    lat: Number(info.lat),
    lng: Number(info.lng),
    source: `${locationPage}?id=${id}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en-CA"));

const venueByLocation = new Map(cityVenues.map((venue) => [venue.locationId, venue]));
const events = [];
let weekStart = verified[0]?.swim.weeks?.[0]?.title;

for (const entry of verified) {
  const weekInfo = entry.swim.weeks[0];
  weekStart ||= weekInfo.title;
  if (weekInfo.title !== weekStart || String(weekInfo.hasPrograms) !== "true") continue;
  const data = await getJson(`${cityApi}/${entry.id}/swim/${weekInfo.json}`);
  const venue = venueByLocation.get(entry.id);
  for (const program of data.programs ?? []) {
    for (const dayGroup of program.days ?? []) {
      if (dayGroup.title !== "Leisure Swim" || dayGroup.age !== "0 years and over") continue;
      for (const time of dayGroup.times ?? []) {
        if (String(time.status).toLowerCase() === "cancelled") continue;
        const parts = time.title.match(/^(.+?)\s+-\s+(.+)$/);
        if (!parts) continue;
        const day = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].indexOf(time.day.toLowerCase());
        if (day < 0) continue;
        events.push({ day, venue: venue.id, start: to24Hour(parts[1]), end: to24Hour(parts[2]), type: "Recreational Swim" });
      }
    }
  }
}

const manualVenues = [{
  id: "toronto-pan-am-sports-centre",
  name: "Toronto Pan Am Sports Centre",
  shortName: "Pan Am",
  district: "Scarborough",
  lat: 43.7907755,
  lng: -79.1936912,
  source: "https://www.tpasc.ca/portal/city-toronto/schedule",
}];
const manualEvents = weekStart === "2026-08-03" ? [
  { day: 1, venue: "toronto-pan-am-sports-centre", start: "14:10", end: "15:50", type: "Recreational Swim" },
  { day: 2, venue: "toronto-pan-am-sports-centre", start: "14:10", end: "16:35", type: "Recreational Swim" },
  { day: 3, venue: "toronto-pan-am-sports-centre", start: "13:00", end: "15:50", type: "Recreational Swim" },
  { day: 4, venue: "toronto-pan-am-sports-centre", start: "13:10", end: "16:35", type: "Recreational Swim" },
  { day: 5, venue: "toronto-pan-am-sports-centre", start: "14:00", end: "16:00", type: "Recreational Swim" },
] : [];

const venues = [...cityVenues, ...manualVenues].sort((a, b) => a.name.localeCompare(b.name, "en-CA"));
const uniqueEvents = [...new Map([...events, ...manualEvents].map((event) => [`${event.day}|${event.venue}|${event.start}|${event.end}`, event])).values()]
  .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start) || a.venue.localeCompare(b.venue));

const monday = new Date(`${weekStart}T12:00:00-04:00`);
const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
const now = new Date();
const toronto = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
const today = new Date(`${toronto}T12:00:00-04:00`);
const todayIndex = Math.floor((today - monday) / 86400000);
const monthDay = (date) => new Intl.DateTimeFormat("zh-CN", { timeZone: "America/Toronto", month: "numeric", day: "numeric" }).format(date);
const dates = Array.from({ length: 7 }, (_, index) => { const d = new Date(monday); d.setDate(monday.getDate() + index); return String(d.getDate()).padStart(2, "0"); });
const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);
const colors = ["#3976b8", "#7a4b95", "#687d39", "#a34d78", "#1779a7", "#c87d24", "#397d67", "#8b5b3e"];

const ts = `export const week = ${JSON.stringify({
  rangeLabel: `${monthDay(monday)} — ${monthDay(sunday)}`,
  dates,
  todayIndex: todayIndex >= 0 && todayIndex < 7 ? todayIndex : -1,
  updatedLabel: new Intl.DateTimeFormat("zh-CN", { timeZone: "America/Toronto", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(now),
  nextUpdateLabel: `${monthDay(nextMonday)}（周一）`,
}, null, 2)} as const;\n\nexport const venues = ${JSON.stringify(venues.map((venue, index) => ({
  id: venue.id,
  name: venue.name,
  shortName: venue.shortName,
  district: venue.district,
  lat: venue.lat,
  lng: venue.lng,
  color: colors[index % colors.length],
  source: venue.source,
})), null, 2)} as const;\n\ntype VenueId = typeof venues[number]["id"];\ntype SwimType = "Recreational Swim";\n\nexport const schedule: Array<{day: number; venue: VenueId; start: string; end: string; type: SwimType}> = ${JSON.stringify(uniqueEvents, null, 2)};\n`;

await writeFile(path.join(root, "app", "schedule-data.ts"), ts, "utf8");
console.log(`Updated ${venues.length} venues and ${uniqueEvents.length} free Leisure Swim slots for week ${weekStart}.`);
