import * as cheerio from "cheerio";

export const CITY_CONFIGS = [
  {
    district: "Markham",
    origin: "https://cityofmarkham.perfectmind.com",
    prefix: "",
    widgetId: "6825ea71-e5b7-4c2a-948f-9195507ad90a",
    calendars: [/^Swimming$/i, /^Aquafit$/i],
    source: "https://www.markham.ca/sports-recreation-fitness/sports-recreation-programs/programs/drop-programs",
    fallback: { lat: 43.8561, lng: -79.337, color: "#2e7d6d" },
  },
  {
    district: "Vaughan",
    origin: "https://vaughan.perfectmind.com",
    prefix: "/25076",
    widgetId: "090e1ac2-67e2-443a-a3a9-bb1b38aa4cb8",
    calendars: [/Swimming\s*&\s*Aquafitness/i],
    source: "https://www.vaughan.ca/residential/recreation-programs-and-fitness/swimming",
    fallback: { lat: 43.8361, lng: -79.4983, color: "#4178a8" },
  },
];

export const RICHMOND_HILL_SOURCES = [
  {
    url: "https://www.richmondhill.ca/en/things-to-do/Swimming.aspx",
    heading: /Drop-In Swim Schedule/i,
    defaultType: "Leisure Swim",
  },
  {
    url: "https://www.richmondhill.ca/en/things-to-do/aquafitness-schedule-and-fees.aspx",
    heading: /Aquafitness Schedules/i,
    defaultType: "Aquafit",
  },
];

export function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function torontoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function classifyActivity(name, fallback = "Leisure Swim") {
  if (/aqua|waterfit|hydro/i.test(name)) return "Aquafit";
  if (/lane|length/i.test(name)) return "Lane Swim";
  if (/swim|pool|wave|therapy|sensory/i.test(name)) return "Leisure Swim";
  return fallback;
}

export function isWomenOnly(...values) {
  return /women|woman|ladies|female/i.test(values.filter(Boolean).join(" "));
}

export function parseTime(value, inferredMeridiem = "") {
  const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] || "00";
  const marker = (match[3] || inferredMeridiem).toLowerCase();
  if (marker.startsWith("p") && hour !== 12) hour += 12;
  if (marker.startsWith("a") && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

export function parseTimeRanges(text) {
  const ranges = [];
  const regex = /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))/gi;
  for (const match of String(text).matchAll(regex)) {
    const endMarker = match[2].match(/(a\.?m\.?|p\.?m\.?)/i)?.[1] || "";
    const start = parseTime(match[1], endMarker);
    const end = parseTime(match[2]);
    if (start && end) ranges.push({ start, end });
  }
  return ranges;
}

export function parseOccurrenceDate(value) {
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function nextPerfectMindDate(result, classes = []) {
  const dates = classes.map((item) => parseOccurrenceDate(item.OccurrenceDate)).filter(Boolean).sort();
  if (dates.length) return addDays(dates.at(-1), 1);

  const raw = String(result.classesMaxEndDateString || result.ClassesMaxEndDateString || "").trim();
  let dateKey = null;
  let match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+.*)?$/);
  if (match) dateKey = `${match[3]}-${match[2]}-${match[1]}`;
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+.*)?$/);
  if (match) dateKey = `${match[1]}-${match[2]}-${match[3]}`;
  return dateKey ? addDays(dateKey, 1) : "";
}

export function normalizePerfectMindEvent(item, config, targetDates) {
  const dateKey = parseOccurrenceDate(item.OccurrenceDate);
  if (!dateKey || !targetDates.has(dateKey)) return null;
  const name = item.EventName || item.Name || "Public Swim";
  const venue = item.Location || item.Facility || item.FacilityName;
  if (!venue) return null;
  const start = parseTime(item.FormattedStartTime || item.StartTime);
  const end = parseTime(item.FormattedEndTime || item.EndTime);
  if (!start || !end) return null;
  const eventId = item.EventId || item.Id;
  const source = eventId
    ? `${config.origin}${config.prefix}/Clients/BookMe4LandingPages/Class?widgetId=${config.widgetId}&classId=${eventId}`
    : config.source;
  return {
    date: dateKey,
    venue: String(venue).trim(),
    start,
    end,
    type: classifyActivity(name),
    womenOnly: isWomenOnly(name, item.Details, item.GenderRestrictions),
    free: false,
    fee: item.PriceRange || item.Price || "Regular drop-in fee",
    source,
  };
}

function cleanText(value) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function headingContainsDate(heading, dateKey) {
  const year = Number(dateKey.slice(0, 4));
  const date = new Date(`${dateKey}T12:00:00Z`);
  const months = "January|February|March|April|May|June|July|August|September|October|November|December";
  const matches = [...heading.matchAll(new RegExp(`(${months})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?`, "gi"))];
  if (!matches.length) return true;
  const toDate = (match, fallbackYear) => new Date(`${match[1]} ${match[2]}, ${match[3] || fallbackYear} 12:00:00 UTC`);
  if (matches.length === 1 && /until/i.test(heading)) return date <= toDate(matches[0], year);
  if (matches.length >= 2) {
    const start = toDate(matches[0], year);
    let endYear = Number(matches[1][3] || year);
    let end = toDate(matches[1], endYear);
    if (end < start && !matches[1][3]) end = toDate(matches[1], year + 1);
    return date >= start && date <= end;
  }
  return true;
}

export function parseRichmondHillSchedule(html, sourceConfig, targetDates) {
  const $ = cheerio.load(html);
  const events = [];
  const headings = $("h2").filter((_, element) => sourceConfig.heading.test(cleanText($(element).text()))).toArray();
  for (const dateKey of targetDates) {
    const heading = headings.find((element) => headingContainsDate(cleanText($(element).text()), dateKey));
    if (!heading) continue;
    const weekdayColumn = new Date(`${dateKey}T12:00:00Z`).getUTCDay() + 1;
    let sibling = $(heading).next();
    while (sibling.length && sibling[0].tagName?.toLowerCase() !== "h2") {
      const nestedTables = sibling.find("table").toArray();
      const tables = nestedTables.length ? nestedTables : (sibling.is("table") ? [sibling[0]] : []);
      for (const tableElement of tables) {
        const table = $(tableElement);
        const outerRowLabel = cleanText(table.closest("tr").prev().text());
        const containerLabel = cleanText(sibling.clone().find("table, script, style").remove().end().text());
        const venueText = outerRowLabel || containerLabel;
        const venue = venueText.match(/([A-Z][A-Za-z' .-]+(?:Pool|Centre))/)?.[1]?.trim();
        if (venue) {
          table.children("tbody").children("tr").each((_, row) => {
            const cells = $(row).find("th,td").toArray();
            if (cells.length < 8) return;
            const activity = cleanText($(cells[0]).text());
            if (!activity || /^activity$/i.test(activity)) return;
            const cell = $(cells[weekdayColumn]).clone();
            cell.find("br").replaceWith("\n");
            const text = cell.text();
            for (const range of parseTimeRanges(text)) {
              events.push({
                date: dateKey,
                venue,
                ...range,
                type: classifyActivity(activity, sourceConfig.defaultType),
                womenOnly: isWomenOnly(activity, text),
                free: false,
                fee: "Richmond Hill drop-in fee",
                source: sourceConfig.url,
              });
            }
          });
        }
      }
      sibling = sibling.next();
    }
  }
  return events;
}

export function dedupeAndSort(events) {
  const unique = new Map();
  for (const event of events) {
    const key = [event.date, event.venue, event.start, event.end, event.type, event.womenOnly].join("|");
    unique.set(key, event);
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.venue.localeCompare(b.venue));
}
