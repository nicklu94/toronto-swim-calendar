"use client";

import { useEffect, useMemo, useState } from "react";
import { schedule, venues, week } from "./schedule-data";
import { regionalSchedule, regionalVenues } from "./regional-schedule-data";

const allVenues = [...venues, ...regionalVenues];
const allSchedule = [
  ...schedule.map((item) => ({ ...item, free: item.free ?? true, fee: item.fee ?? "", source: item.source || venues.find((venue) => venue.id === item.venue)?.source || "" })),
  ...regionalSchedule,
];
const venueNames = new Map(allVenues.map((venue) => [venue.id, venue.name]));
type CityFilter = "all" | "Toronto" | "Markham" | "Richmond Hill" | "Vaughan";

function cityForVenue(venue: { district: string }): Exclude<CityFilter, "all"> {
  if (venue.district === "Markham" || venue.district === "Richmond Hill" || venue.district === "Vaughan") {
    return venue.district;
  }
  return "Toronto";
}

const cityOptions: Array<{ value: CityFilter; label: Record<"zh" | "en", string> }> = [
  { value: "all", label: { zh: "全部城市", en: "All cities" } },
  { value: "Toronto", label: { zh: "City of Toronto", en: "City of Toronto" } },
  { value: "Markham", label: { zh: "Markham", en: "Markham" } },
  { value: "Richmond Hill", label: { zh: "Richmond Hill", en: "Richmond Hill" } },
  { value: "Vaughan", label: { zh: "Vaughan", en: "Vaughan" } },
];
const collapsedVenueLimit = 12;
const englishDayNames: Record<string, string> = {
  周日: "Sunday",
  周一: "Monday",
  周二: "Tuesday",
  周三: "Wednesday",
  周四: "Thursday",
  周五: "Friday",
  周六: "Saturday",
};
const copy = {
  zh: {
    home: "泳池日历首页",
    brand: "泳池日历",
    update: "三市扩展测试版",
    language: "Switch to English",
    languageButton: "English",
    title: "未来 7 天，什么时候可以去游泳？",
    intro: "免费泳池大多在 City of Toronto；Markham、Richmond Hill 和 Vaughan 主要是收费泳池，常规 drop-in 大多约 $3.55–$13.90。默认仍只显示免费场次；收费场次会明确标注，并可选择显示。",
    nextSeven: "未来 7 天",
    sessions: "开放时段",
    pools: "泳池地点",
    sessionCount: (value: number) => `${value} 个`,
    poolCount: (value: number) => `${value} 个`,
    filters: "日历筛选",
    postalCode: "你的邮编",
    postalPlaceholder: "例如 M1P 4P5",
    searching: "查询中…",
    findPools: "查找泳池",
    showAll: "显示全部",
    radius: "距离范围",
    privacy: "邮编不会保存；新增三市地点在本测试中按城市中心近似计算距离。",
    invalidPostal: "无法查询这个邮编。",
    status: (fsa: string, radius: number, count: number) => `已使用 ${fsa} 邮区的近似中心，显示 ${radius} km 内的 ${count} 个地点。`,
    prompt: "输入邮编后拖动滑杆，缩小日历范围。",
    filterByVenue: "按地点筛选",
    activityType: "活动类型",
    allActivities: "全部活动",
    leisureSwim: "Leisure Swim",
    laneSwim: "Lane Swim",
    aquafit: "Aquafit",
    womenOnly: "Women Only",
    priceFilter: "费用",
    freeOnly: "只看免费",
    includePaid: "包括收费",
    paid: "收费",
    allLocations: "全部地点",
    showAllLocations: (value: number) => `展开全部 ${value} 个地点`,
    showFewerLocations: "收起地点",
    calendar: "未来七天游泳日历",
    today: "今天",
    empty: "暂无开放时段",
    freeSwim: "免费开放游泳",
    freeLaneSwim: "免费 Lane Swim",
    freeAquafit: "免费 Aquafit",
    womenOnlyBadge: "仅限女性",
    sources: "地点与官方来源",
    sourceCount: (value: number) => `${value} 个地点 · 点击展开`,
    officialSchedule: "官方排期",
    noLocations: "这个范围内没有收录的泳池，请把距离调大一些。",
    noticeTitle: "出发前请再点开官方排期确认。",
    notice: "这是一次性测试快照。Markham 和 Vaughan 的预约系统在抓取时仅开放了 8 月 9–10 日；Richmond Hill 使用其本周公布的固定周表。Toronto 的常规收费场次按官方公开排期收录，但官方数据不逐场次提供价格；出发前请查看官方页面。",
    footer: "泳池日历 · Toronto + York Region 测试",
    nextUpdate: "测试数据抓取于",
  },
  en: {
    home: "Swim calendar home",
    brand: "wim Calendar",
    update: "Three-city expansion test",
    language: "切换到中文",
    languageButton: "中文",
    title: "When can I swim in the next 7 days?",
    intro: "Most free swims are in the City of Toronto. Markham, Richmond Hill and Vaughan are mostly paid pools, with regular drop-ins generally around $3.55–$13.90. Free-only remains the default; paid sessions are clearly labelled and optional.",
    nextSeven: "Next 7 days",
    sessions: "Open sessions",
    pools: "Pool locations",
    sessionCount: (value: number) => `${value} sessions`,
    poolCount: (value: number) => `${value} pools`,
    filters: "Calendar filters",
    postalCode: "Your postal code",
    postalPlaceholder: "e.g. M1P 4P5",
    searching: "Searching…",
    findPools: "Find pools",
    showAll: "Show all",
    radius: "Distance radius",
    privacy: "Your postal code is not saved. Added-city distances use approximate city centres in this test.",
    invalidPostal: "We could not find that postal code.",
    status: (fsa: string, radius: number, count: number) => `Using the approximate centre of ${fsa}; showing ${count} locations within ${radius} km.`,
    prompt: "Enter a postal code, then move the slider to narrow the calendar.",
    filterByVenue: "Filter by location",
    activityType: "Activity type",
    allActivities: "All activities",
    leisureSwim: "Leisure Swim",
    laneSwim: "Lane Swim",
    aquafit: "Aquafit",
    womenOnly: "Women Only",
    priceFilter: "Cost",
    freeOnly: "Free only",
    includePaid: "Include paid",
    paid: "Paid",
    allLocations: "All locations",
    showAllLocations: (value: number) => `Show all ${value} locations`,
    showFewerLocations: "Show fewer locations",
    calendar: "Swimming calendar for the next seven days",
    today: "Today",
    empty: "No open sessions",
    freeSwim: "Free Leisure Swim",
    freeLaneSwim: "Free Lane Swim",
    freeAquafit: "Free Aquafit",
    womenOnlyBadge: "Women Only",
    sources: "Locations & official sources",
    sourceCount: (value: number) => `${value} locations · Expand`,
    officialSchedule: "Official schedule",
    noLocations: "No listed pools are within this radius. Try increasing the distance.",
    noticeTitle: "Check the official schedule before you leave.",
    notice: "This is a one-time test snapshot. Markham and Vaughan's booking systems exposed only August 9–10 when collected; Richmond Hill uses its published weekly table. Toronto regular paid sessions are collected from the official public schedule, but the official feed does not provide per-session prices. Check the official page before travelling.",
    footer: "Swim Calendar · Toronto + York Region test",
    nextUpdate: "Test data collected",
  },
} as const;
type Origin = { lat: number; lng: number; postalCode: string; approximate: boolean };

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function Home() {
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [city, setCity] = useState<CityFilter>("all");
  const [activity, setActivity] = useState<"all" | "Leisure Swim" | "Lane Swim" | "Aquafit" | "Women Only">("all");
  const [cost, setCost] = useState<"free" | "all">("free");
  const [selected, setSelected] = useState("all");
  const [venueExpanded, setVenueExpanded] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radiusKm, setRadiusKm] = useState(8);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const text = copy[language];

  useEffect(() => {
    const saved = window.localStorage.getItem("swim-calendar-language");
    if (saved === "en" || saved === "zh") {
      setLanguage(saved);
      document.documentElement.lang = saved === "en" ? "en-CA" : "zh-CN";
    } else {
      document.documentElement.lang = "en-CA";
    }
  }, []);

  function toggleLanguage() {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    window.localStorage.setItem("swim-calendar-language", next);
    document.documentElement.lang = next === "en" ? "en-CA" : "zh-CN";
    setSearchError("");
  }

  const venueDistances = useMemo(() => new Map(allVenues.map((venue) => [
    venue.id,
    origin ? distanceKm(origin, venue) : null,
  ])), [origin]);

  const cityFilteredVenues = useMemo(
    () => city === "all" ? allVenues : allVenues.filter((venue) => cityForVenue(venue) === city),
    [city]
  );

  const filteredVenues = useMemo(
    () => origin ? cityFilteredVenues.filter((venue) => (venueDistances.get(venue.id) ?? Infinity) <= radiusKm) : cityFilteredVenues,
    [cityFilteredVenues, origin, radiusKm, venueDistances]
  );
  const filteredVenueIds = useMemo(() => new Set(filteredVenues.map((venue) => venue.id)), [filteredVenues]);
  const displayedVenues = useMemo(() => {
    if (venueExpanded || filteredVenues.length <= collapsedVenueLimit) return filteredVenues;
    const collapsed = filteredVenues.slice(0, collapsedVenueLimit);
    if (selected === "all" || collapsed.some((venue) => venue.id === selected)) return collapsed;
    const selectedVenue = filteredVenues.find((venue) => venue.id === selected);
    return selectedVenue ? [...collapsed, selectedVenue] : collapsed;
  }, [filteredVenues, selected, venueExpanded]);
  const hiddenVenueCount = Math.max(filteredVenues.length - displayedVenues.length, 0);

  useEffect(() => {
    if (selected !== "all" && !filteredVenueIds.has(selected)) {
      setSelected("all");
    }
  }, [filteredVenueIds, selected]);

  useEffect(() => {
    setVenueExpanded(false);
  }, [city, origin, radiusKm]);

  const visible = useMemo(
    () => [...allSchedule]
      .filter((item) => filteredVenueIds.has(item.venue))
      .filter((item) => selected === "all" || item.venue === selected)
      .filter((item) => cost === "all" || item.free)
      .filter((item) => activity === "all" || (activity === "Women Only" ? item.womenOnly : item.type === activity))
      .sort((a, b) =>
        a.day - b.day ||
        timeToMinutes(a.start) - timeToMinutes(b.start) ||
        (venueNames.get(a.venue) ?? "").localeCompare(venueNames.get(b.venue) ?? "", "en-CA")
      ),
    [activity, cost, filteredVenueIds, selected]
  );

  const count = visible.length;

  async function locate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/geocode?postalCode=${encodeURIComponent(postalCode)}`);
      const result = await response.json() as Origin & { error?: string };
      if (!response.ok) throw new Error(text.invalidPostal);
      setOrigin(result);
      setPostalCode(result.postalCode);
      setSelected("all");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : text.invalidPostal);
    } finally {
      setSearching(false);
    }
  }

  function clearLocation() {
    setOrigin(null);
    setPostalCode("");
    setSearchError("");
    setSelected("all");
  }

  return (
    <main>
      <header className="hero">
        <nav className="nav">
          <a className="brand" href="#top" aria-label={text.home}>
            <span className="brand-mark">{language === "en" ? "S" : "游"}</span>
            <span>{text.brand}</span>
          </a>
          <div className="nav-actions">
            <span className="updated">{text.update} · {week.updatedLabel}</span>
            <button className="language-toggle" type="button" onClick={toggleLanguage} aria-label={text.language}>{text.languageButton}</button>
          </div>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow">TEST · TORONTO + MARKHAM + RICHMOND HILL + VAUGHAN</p>
          <h1>{text.title}</h1>
          <p className="dek">{text.intro}</p>
        </div>

        <div className="week-meta">
          <div><span>{text.nextSeven}</span><strong>{week.rangeLabel}</strong></div>
          <div><span>{text.sessions}</span><strong>{text.sessionCount(count)}</strong></div>
          <div><span>{text.pools}</span><strong>{text.poolCount(filteredVenues.length)}</strong></div>
        </div>
      </header>

      <section className="controls" aria-label={text.filters}>
        <form className="locator" onSubmit={locate}>
          <label className="postal-field">
            <span>{text.postalCode}</span>
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value.toUpperCase())}
              placeholder={text.postalPlaceholder}
              inputMode="text"
              autoComplete="postal-code"
              maxLength={7}
              aria-describedby="postal-privacy postal-status"
            />
          </label>
          <button className="locate-button" type="submit" disabled={searching}>{searching ? text.searching : text.findPools}</button>
          {origin && <button className="clear-button" type="button" onClick={clearLocation}>{text.showAll}</button>}
          <label className="radius-field">
            <span>{text.radius} <strong>{radiusKm} km</strong></span>
            <input type="range" min="1" max="30" step="1" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} />
          </label>
          <small id="postal-privacy">{text.privacy}</small>
          <p id="postal-status" className={searchError ? "locator-status error" : "locator-status"} aria-live="polite">
            {searchError || (origin
              ? text.status(origin.postalCode.slice(0, 3), radiusKm, filteredVenues.length)
              : text.prompt)}
          </p>
        </form>
        <div className="activity-row city-row">
          <span>{language === "en" ? "City" : "城市"}</span>
          <div className="activity-tabs" role="group" aria-label={language === "en" ? "City" : "城市"}>
            {cityOptions.map((option) => (
              <button
                key={option.value}
                className={city === option.value ? "active" : ""}
                onClick={() => {
                  setCity(option.value);
                  setSelected("all");
                }}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>
        <div className="activity-row">
          <span>{text.activityType}</span>
          <div className="activity-tabs" role="group" aria-label={text.activityType}>
            <button className={activity === "all" ? "active" : ""} onClick={() => setActivity("all")}>{text.allActivities}</button>
            <button className={activity === "Leisure Swim" ? "active" : ""} onClick={() => setActivity("Leisure Swim")}>{text.leisureSwim}</button>
            <button className={activity === "Lane Swim" ? "active" : ""} onClick={() => setActivity("Lane Swim")}>{text.laneSwim}</button>
            <button className={activity === "Aquafit" ? "active" : ""} onClick={() => setActivity("Aquafit")}>{text.aquafit}</button>
            <button className={activity === "Women Only" ? "active" : ""} onClick={() => setActivity("Women Only")}>{text.womenOnly}</button>
          </div>
        </div>
        <div className="activity-row cost-row">
          <span>{text.priceFilter}</span>
          <div className="activity-tabs" role="group" aria-label={text.priceFilter}>
            <button className={cost === "free" ? "active" : ""} onClick={() => setCost("free")}>{text.freeOnly}</button>
            <button className={cost === "all" ? "active" : ""} onClick={() => setCost("all")}>{text.includePaid}</button>
          </div>
        </div>
        <div className="venue-tabs" role="group" aria-label={text.filterByVenue}>
          <button className={selected === "all" ? "active" : ""} onClick={() => setSelected("all")}>{text.allLocations}</button>
          {displayedVenues.map((venue) => (
            <button key={venue.id} className={selected === venue.id ? "active" : ""} onClick={() => setSelected(venue.id)}>
              {venue.shortName}{origin && <small>{venueDistances.get(venue.id)?.toFixed(1)} km</small>}
            </button>
          ))}
          {filteredVenues.length > collapsedVenueLimit && (
            <button className="venue-more-button" type="button" onClick={() => setVenueExpanded((value) => !value)}>
              {venueExpanded ? text.showFewerLocations : text.showAllLocations(filteredVenues.length)}
              {!venueExpanded && hiddenVenueCount > 0 && <small>+{hiddenVenueCount}</small>}
            </button>
          )}
        </div>
      </section>

      <section className="calendar" aria-label={`${week.rangeLabel} ${text.calendar}`}>
        {week.dayNames.map((day, dayIndex) => {
          const items = visible.filter((item) => item.day === dayIndex);
          const isToday = week.todayIndex === dayIndex;
          return (
            <article className={`day ${isToday ? "today" : ""}`} key={day}>
              <div className="day-heading">
                <span>{language === "en" ? englishDayNames[day] : day}</span>
                <strong>{week.dates[dayIndex]}</strong>
                {isToday && <em>{text.today}</em>}
              </div>
              <div className="slots">
                {items.length === 0 ? <p className="empty">{text.empty}</p> : items.map((item, index) => {
                  const venue = allVenues.find((entry) => entry.id === item.venue)!;
                  return (
                    <a className={`slot ${item.free ? "" : "paid-slot"}`} style={{"--venue": venue.color} as React.CSSProperties} href={item.source || venue.source} target="_blank" rel="noreferrer" key={`${item.venue}-${item.start}-${index}`}>
                      <span className="slot-venue">{venue.shortName}</span>
                      <strong>{item.start}<i>—</i>{item.end}</strong>
                      <div className="slot-labels">
                        <small>{item.free ? (item.type === "Aquafit" ? text.freeAquafit : item.type === "Lane Swim" ? text.freeLaneSwim : text.freeSwim) : item.type}</small>
                        {!item.free && <span className="paid-badge">{text.paid} · {item.fee}</span>}
                        {item.womenOnly && <span className="women-only-badge">{text.womenOnlyBadge}</span>}
                      </div>
                    </a>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <details className="locations">
        <summary className="section-title">
          <span>
            <span className="eyebrow">LOCATIONS & SOURCES</span>
            <strong>{text.sources}</strong>
          </span>
          <span className="source-count">{text.sourceCount(filteredVenues.length)}</span>
        </summary>
        <div className="location-grid">
          {filteredVenues.map((venue) => (
            <a className="location-card" href={venue.source} target="_blank" rel="noreferrer" key={venue.id}>
              <span className="location-number">{String(filteredVenues.indexOf(venue) + 1).padStart(2, "0")}</span>
              <div>
                <h3>{venue.name}</h3>
                <p>{venue.district} · {text.officialSchedule}{origin && ` · ${venueDistances.get(venue.id)?.toFixed(1)} km`}</p>
              </div>
              <span className="arrow">↗</span>
            </a>
          ))}
          {filteredVenues.length === 0 && <p className="no-locations">{text.noLocations}</p>}
        </div>
      </details>

      <aside className="notice">
        <strong>{text.noticeTitle}</strong>
        <p>{text.notice}</p>
      </aside>

      <footer>
        <span>{text.footer}</span>
        <span>{text.nextUpdate}: {week.updatedLabel}</span>
      </footer>
    </main>
  );
}
