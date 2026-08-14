const chineseDayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

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

export function addDateKeyDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function monthDay(dateKey: string) {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}/${day}`;
}

export function buildDisplayWeek(today = torontoDateKey()) {
  const dateKeys = Array.from({ length: 7 }, (_, index) => addDateKeyDays(today, index));
  return {
    dateKeys,
    rangeLabel: `${monthDay(dateKeys[0])} — ${monthDay(dateKeys[6])}`,
    dates: dateKeys.map((date) => String(Number(date.slice(-2)))),
    dayNames: dateKeys.map((date) => chineseDayNames[new Date(`${date}T12:00:00Z`).getUTCDay()]),
    todayIndex: 0,
  };
}
