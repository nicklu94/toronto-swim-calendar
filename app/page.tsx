"use client";

import { useEffect, useMemo, useState } from "react";
import { schedule, scheduleMetadata, venues } from "./schedule-data";
import { regionalSchedule, regionalVenues } from "./regional-schedule-data";
import { PoolRating } from "./pool-rating";
import { buildDisplayWeek } from "./schedule-window";
import { poolSettingForVenue, sessionContainsTime, type PoolSettingFilter } from "./schedule-filters";

const allVenues = [...venues, ...regionalVenues];
const allSchedule = [
  ...schedule.map((item) => ({ ...item, free: item.free ?? true, fee: item.fee ?? "", source: item.source || venues.find((venue) => venue.id === item.venue)?.source || "" })),
  ...regionalSchedule,
];
const venueNames = new Map(allVenues.map((venue) => [venue.id, venue.name]));
type CityFilter = "all" | "Toronto" | "Markham" | "Richmond Hill" | "Vaughan";
const serviceAlerts = [
  {
    venue: "Toronto Pan Am Sports Centre",
    checked: "Checked Aug 9, 2026, 2:08 a.m. America/Toronto",
    source: "https://www.tpasc.ca/portal/city-toronto/schedule",
    zh: "TPASC 官方公告：Competition Pool 于 2026-08-08 至 2026-08-09 19:00-24:00 不可用，并于 2026-08-09 至 2026-09-07 05:00-24:00 不可用。出发前请点击官方排期确认 Training Pool / leisure swim 是否仍按现场安排开放。",
    en: "TPASC official notice: the Competition Pool is unavailable Aug 8-9, 2026 from 7 p.m. to midnight, and Aug 9-Sep 7, 2026 from 5 a.m. to midnight. Before travelling, open the official schedule to confirm whether Training Pool / leisure swim access is still operating on site.",
  },
] as const;

function cityForVenue(venue: { district: string }): Exclude<CityFilter, "all"> {
  if (venue.district === "Markham" || venue.district === "Richmond Hill" || venue.district === "Vaughan") {
    return venue.district;
  }
  return "Toronto";
}

const cityOptions: Array<{ value: CityFilter; label: Record<"zh" | "en", string> }> = [
  { value: "all", label: { zh: "全部城市", en: "All cities" } },
  { value: "Toronto", label: { zh: "多伦多市", en: "City of Toronto" } },
  { value: "Markham", label: { zh: "万锦市", en: "Markham" } },
  { value: "Richmond Hill", label: { zh: "列治文山市", en: "Richmond Hill" } },
  { value: "Vaughan", label: { zh: "旺市", en: "Vaughan" } },
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
    update: "Toronto + York Region",
    language: "Switch to English",
    languageButton: "English",
    title: "未来 7 天，什么时候可以去游泳？",
    intro: "免费泳池大多在 City of Toronto；Markham、Richmond Hill 和 Vaughan 主要是收费泳池。",
    nextSeven: "未来 7 天",
    sessions: "开放时段",
    pools: "泳池地点",
    sessionCount: (value: number) => `${value} 个`,
    poolCount: (value: number) => `${value} 个`,
    filters: "日历筛选",
    expandFilters: "展开筛选",
    collapseFilters: "收起筛选",
    filterSummary: (active: number, sessions: number) => active > 0
      ? `${active} 组筛选已启用 · ${sessions} 个开放时段`
      : `${sessions} 个开放时段 · 点击调整条件`,
    postalCode: "你的邮编",
    postalPlaceholder: "例如 M1P 4P5",
    searching: "查询中…",
    findPools: "查找泳池",
    showAll: "显示全部",
    radius: "距离范围",
    privacy: "邮编不会保存；Markham、Richmond Hill 和 Vaughan 地点目前按城市中心近似计算距离。",
    invalidPostal: "无法查询这个邮编。",
    status: (fsa: string, radius: number, count: number) => `已使用 ${fsa} 邮区的近似中心，显示 ${radius} km 内的 ${count} 个地点。`,
    prompt: "输入邮编后拖动滑杆，缩小日历范围。",
    filterByVenue: "按地点筛选",
    activityType: "活动类型",
    allActivities: "全部活动",
    leisureSwim: "休闲游泳",
    laneSwim: "泳道游泳",
    aquafit: "水中健身",
    womenOnly: "仅限女性",
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
    notice: "数据来自各市官方公开排期。Markham 和 Vaughan 的预约系统有时只开放近期日期；Richmond Hill 使用其公布的周表。Toronto 的常规收费场次按官方公开排期收录，但官方数据不逐场次提供价格；出发前请查看官方页面。",
    footer: "泳池日历 · Toronto + York Region",
    nextUpdate: "数据抓取于",
    releaseLabel: "最新更新",
    releaseDate: "2026 年 8 月 16 日",
    releaseSummary: "已修正 Pleasantview Community Centre 的泳池类型，现在正确显示为露天泳池。",
    dayFilter: "星期",
    allDays: "显示全部日期",
    poolSetting: "泳池类型",
    allPoolSettings: "全部",
    indoorPool: "室内泳池",
    outdoorPool: "露天泳池",
    poolSettingNote: "泳池类型依据各市官方场馆指南整理。",
    timeFilter: "游泳时间",
    openAt: "这个时间仍开放",
    clearScheduleFilters: "清除时间",
  },
  en: {
    home: "Swim calendar home",
    brand: "wim Calendar",
    update: "Toronto + York Region",
    language: "切换到中文",
    languageButton: "中文",
    title: "When can I swim in the next 7 days?",
    intro: "Most free swims are in the City of Toronto. Markham, Richmond Hill and Vaughan are mostly paid pools.",
    nextSeven: "Next 7 days",
    sessions: "Open sessions",
    pools: "Pool locations",
    sessionCount: (value: number) => `${value} sessions`,
    poolCount: (value: number) => `${value} pools`,
    filters: "Calendar filters",
    expandFilters: "Show filters",
    collapseFilters: "Hide filters",
    filterSummary: (active: number, sessions: number) => active > 0
      ? `${active} active ${active === 1 ? "filter" : "filters"} · ${sessions} sessions`
      : `${sessions} sessions · Open to refine`,
    postalCode: "Your postal code",
    postalPlaceholder: "e.g. M1P 4P5",
    searching: "Searching…",
    findPools: "Find pools",
    showAll: "Show all",
    radius: "Distance radius",
    privacy: "Your postal code is not saved. Markham, Richmond Hill and Vaughan distances currently use approximate city centres.",
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
    notice: "Data is collected from official public schedules. Markham and Vaughan booking systems sometimes expose only near-term dates; Richmond Hill uses its published weekly table. Toronto regular paid sessions are collected from the official public schedule, but the official feed does not provide per-session prices. Check the official page before travelling.",
    footer: "Swim Calendar · Toronto + York Region",
    nextUpdate: "Data collected",
    releaseLabel: "Latest update",
    releaseDate: "August 16, 2026",
    releaseSummary: "Corrected Pleasantview Community Centre so it is now shown as an outdoor pool.",
    dayFilter: "Day",
    allDays: "Show all days",
    poolSetting: "Pool setting",
    allPoolSettings: "All",
    indoorPool: "Indoor",
    outdoorPool: "Outdoor",
    poolSettingNote: "Pool settings are classified from official municipal facility guides.",
    timeFilter: "Swim time",
    openAt: "Open at this time",
    clearScheduleFilters: "Clear time",
  },
} as const;
type Origin = { lat: number; lng: number; postalCode: string; approximate: boolean; kind?: "postal" | "device" };

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
  const week = useMemo(() => buildDisplayWeek(), []);
  const displayDateIndex = useMemo(() => new Map(week.dateKeys.map((date, index) => [date, index])), [week]);
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [city, setCity] = useState<CityFilter>("all");
  const [activity, setActivity] = useState<"all" | "Leisure Swim" | "Lane Swim" | "Aquafit" | "Women Only">("all");
  const [cost, setCost] = useState<"free" | "all">("free");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [poolSetting, setPoolSetting] = useState<PoolSettingFilter>("all");
  const [selectedTime, setSelectedTime] = useState("");
  const [selected, setSelected] = useState("all");
  const [venueExpanded, setVenueExpanded] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radiusKm, setRadiusKm] = useState(8);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const text = copy[language];
  const nearbyCopy = language === "en"
    ? {
        useLocation: "Use my location",
        locating: "Locating…",
        locationStatus: (radius: number, count: number) => `Using your current location; showing ${count} pools within ${radius} km, nearest first.`,
        unavailable: "Location is unavailable. Enter a postal code instead.",
        denied: "Location permission was denied. You can still enter a postal code.",
        choosePool: "Choose a pool above to view and submit its community rating.",
      }
    : {
        useLocation: "使用我的位置",
        locating: "定位中…",
        locationStatus: (radius: number, count: number) => `已使用你的当前位置，按由近到远显示 ${radius} km 内的 ${count} 个泳池。`,
        unavailable: "暂时无法获取定位，请改用邮编查询。",
        denied: "定位权限未开启，你仍可输入邮编查询。",
        choosePool: "请在上方选择一个泳池，查看并提交社区评分。",
      };

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
    () => allVenues
      .filter((venue) => city === "all" || cityForVenue(venue) === city)
      .filter((venue) => poolSetting === "all" || poolSettingForVenue(venue.id) === poolSetting),
    [city, poolSetting]
  );

  const filteredVenues = useMemo(() => {
    if (!origin) return cityFilteredVenues;
    return cityFilteredVenues
      .filter((venue) => (venueDistances.get(venue.id) ?? Infinity) <= radiusKm)
      .sort((a, b) => (venueDistances.get(a.id) ?? Infinity) - (venueDistances.get(b.id) ?? Infinity));
  }, [cityFilteredVenues, origin, radiusKm, venueDistances]);
  const filteredVenueIds = useMemo(() => new Set(filteredVenues.map((venue) => venue.id)), [filteredVenues]);
  const displayedVenues = useMemo(() => {
    if (venueExpanded || filteredVenues.length <= collapsedVenueLimit) return filteredVenues;
    const collapsed = filteredVenues.slice(0, collapsedVenueLimit);
    if (selected === "all" || collapsed.some((venue) => venue.id === selected)) return collapsed;
    const selectedVenue = filteredVenues.find((venue) => venue.id === selected);
    return selectedVenue ? [...collapsed, selectedVenue] : collapsed;
  }, [filteredVenues, selected, venueExpanded]);
  const hiddenVenueCount = Math.max(filteredVenues.length - displayedVenues.length, 0);
  const selectedVenue = selected === "all" ? null : allVenues.find((venue) => venue.id === selected) ?? null;

  useEffect(() => {
    if (selected !== "all" && !filteredVenueIds.has(selected)) {
      setSelected("all");
    }
  }, [filteredVenueIds, selected]);

  useEffect(() => {
    setVenueExpanded(false);
  }, [city, origin, poolSetting, radiusKm]);

  const visible = useMemo(
    () => [...allSchedule]
      .filter((item) => displayDateIndex.has(item.date))
      .filter((item) => filteredVenueIds.has(item.venue))
      .filter((item) => selected === "all" || item.venue === selected)
      .filter((item) => selectedDays.length === 0 || selectedDays.includes(item.date))
      .filter((item) => cost === "all" || item.free)
      .filter((item) => activity === "all" || (activity === "Women Only" ? item.womenOnly : item.type === activity))
      .filter((item) => sessionContainsTime(item, selectedTime))
      .sort((a, b) =>
        (displayDateIndex.get(a.date) ?? 99) - (displayDateIndex.get(b.date) ?? 99) ||
        timeToMinutes(a.start) - timeToMinutes(b.start) ||
        (venueNames.get(a.venue) ?? "").localeCompare(venueNames.get(b.venue) ?? "", "en-CA")
      ),
    [activity, cost, displayDateIndex, filteredVenueIds, selected, selectedDays, selectedTime]
  );

  const displayedDayIndices = useMemo(
    () => week.dateKeys
      .map((dateKey, index) => ({ dateKey, index }))
      .filter(({ dateKey }) => selectedDays.length === 0 || selectedDays.includes(dateKey))
      .map(({ index }) => index),
    [selectedDays, week.dateKeys]
  );

  const count = visible.length;
  const activeFilterCount = [
    city !== "all",
    activity !== "all",
    cost !== "free",
    selectedDays.length > 0,
    poolSetting !== "all",
    selectedTime !== "",
    selected !== "all",
    origin !== null,
  ].filter(Boolean).length;

  async function locate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/geocode?postalCode=${encodeURIComponent(postalCode)}`);
      const result = await response.json() as Origin & { error?: string };
      if (!response.ok) throw new Error(text.invalidPostal);
      setOrigin({ ...result, kind: "postal" });
      setPostalCode(result.postalCode);
      setSelected("all");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : text.invalidPostal);
    } finally {
      setSearching(false);
    }
  }

  function useCurrentLocation() {
    setSearchError("");
    if (!("geolocation" in navigator)) {
      setSearchError(nearbyCopy.unavailable);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          postalCode: "",
          approximate: position.coords.accuracy > 1000,
          kind: "device",
        });
        setPostalCode("");
        setSelected("all");
        setLocating(false);
      },
      (error) => {
        setSearchError(error.code === error.PERMISSION_DENIED ? nearbyCopy.denied : nearbyCopy.unavailable);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
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
            <a className="feedback-link" href="mailto:superninglu@gmail.com?subject=Toronto%20Swim%20Calendar%20Feedback"><span>Feedback · </span>superninglu@gmail.com</a>
            <span className="updated">{text.update} · {scheduleMetadata.updatedLabel}</span>
            <button className="language-toggle" type="button" onClick={toggleLanguage} aria-label={text.language}>{text.languageButton}</button>
          </div>
        </nav>

        <div className="release-banner" role="status">
          <strong>{text.releaseLabel} · {text.releaseDate}</strong>
          <span>{text.releaseSummary}</span>
        </div>

        <div className="hero-copy" id="top">
          <p className="eyebrow">TORONTO · MARKHAM · RICHMOND HILL · VAUGHAN</p>
          <h1>{text.title}</h1>
          <p className="dek">{text.intro}</p>
        </div>

        <div className="week-meta">
          <div><span>{text.nextSeven}</span><strong>{week.rangeLabel}</strong></div>
          <div><span>{text.sessions}</span><strong>{text.sessionCount(count)}</strong></div>
          <div><span>{text.pools}</span><strong>{text.poolCount(filteredVenues.length)}</strong></div>
        </div>
      </header>

      <section className={`controls${filtersExpanded ? " is-expanded" : ""}`} aria-label={text.filters}>
        <div className="controls-bar">
          <div className="controls-summary">
            <span>{text.filters}</span>
            <strong aria-live="polite">{text.filterSummary(activeFilterCount, count)}</strong>
          </div>
          <button
            className="controls-toggle"
            type="button"
            aria-expanded={filtersExpanded}
            aria-controls="filter-panel"
            onClick={() => setFiltersExpanded((value) => !value)}
          >
            {filtersExpanded ? text.collapseFilters : text.expandFilters}
            <span aria-hidden="true">{filtersExpanded ? "−" : "+"}</span>
          </button>
        </div>
        <div id="filter-panel" className="controls-body" hidden={!filtersExpanded}>
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
          <button className="device-location-button" type="button" onClick={useCurrentLocation} disabled={locating}>
            {locating ? nearbyCopy.locating : nearbyCopy.useLocation}
          </button>
          {origin && <button className="clear-button" type="button" onClick={clearLocation}>{text.showAll}</button>}
          <label className="radius-field">
            <span>{text.radius} <strong>{radiusKm} km</strong></span>
            <input type="range" min="1" max="30" step="1" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} />
          </label>
          <small id="postal-privacy">{text.privacy} {language === "en" ? "Device location is processed in this browser and is not saved." : "设备定位仅在当前浏览器中计算，不会保存。"}</small>
          <p id="postal-status" className={searchError ? "locator-status error" : "locator-status"} aria-live="polite">
            {searchError || (origin
              ? (origin.kind === "device" ? nearbyCopy.locationStatus(radiusKm, filteredVenues.length) : text.status(origin.postalCode.slice(0, 3), radiusKm, filteredVenues.length))
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
        <div className="activity-row schedule-filter-row">
          <span>{text.poolSetting}</span>
          <div className="activity-tabs" role="group" aria-label={text.poolSetting}>
            <button className={poolSetting === "all" ? "active" : ""} onClick={() => setPoolSetting("all")}>{text.allPoolSettings}</button>
            <button className={poolSetting === "indoor" ? "active" : ""} onClick={() => setPoolSetting("indoor")}>{text.indoorPool}</button>
            <button className={poolSetting === "outdoor" ? "active" : ""} onClick={() => setPoolSetting("outdoor")}>{text.outdoorPool}</button>
          </div>
          <small className="filter-note">{text.poolSettingNote}</small>
        </div>
        <div className="activity-row schedule-filter-row day-filter-row">
          <span>{text.dayFilter}</span>
          <div className="activity-tabs" role="group" aria-label={text.dayFilter}>
            <button className={selectedDays.length === 0 ? "active" : ""} onClick={() => setSelectedDays([])}>{text.allDays}</button>
            {week.dateKeys.map((dateKey, index) => (
              <button
                key={dateKey}
                className={selectedDays.includes(dateKey) ? "active" : ""}
                aria-pressed={selectedDays.includes(dateKey)}
                onClick={() => setSelectedDays((current) => current.includes(dateKey)
                  ? current.filter((value) => value !== dateKey)
                  : [...current, dateKey])}
              >
                {language === "en" ? englishDayNames[week.dayNames[index]] : week.dayNames[index]} <small>{week.dates[index]}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="activity-row schedule-filter-row time-filter-row">
          <span>{text.timeFilter}</span>
          <label>
            <span>{text.openAt}</span>
            <input type="time" value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} aria-label={text.openAt} />
          </label>
          {selectedTime && (
            <button className="clear-time-button" type="button" onClick={() => setSelectedTime("")}>
              {text.clearScheduleFilters}
            </button>
          )}
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
        </div>
      </section>

      {selectedVenue ? (
        <PoolRating key={selectedVenue.id} venueId={selectedVenue.id} venueName={selectedVenue.name} language={language} />
      ) : (
        <p className="rating-select-hint">{nearbyCopy.choosePool}</p>
      )}

      <section className="calendar" aria-label={`${week.rangeLabel} ${text.calendar}`}>
        {displayedDayIndices.map((dayIndex) => {
          const day = week.dayNames[dayIndex];
          const items = visible.filter((item) => item.date === week.dateKeys[dayIndex]);
          const isToday = week.todayIndex === dayIndex;
          return (
            <article className={`day ${isToday ? "today" : ""}`} key={week.dateKeys[dayIndex]}>
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
                <p>{venue.district} · {poolSettingForVenue(venue.id) === "outdoor" ? text.outdoorPool : text.indoorPool} · {text.officialSchedule}{origin && ` · ${venueDistances.get(venue.id)?.toFixed(1)} km`}</p>
              </div>
              <span className="arrow">↗</span>
            </a>
          ))}
          {filteredVenues.length === 0 && <p className="no-locations">{text.noLocations}</p>}
        </div>
      </details>

      {serviceAlerts.length > 0 && (
        <section className="service-alerts" aria-label={language === "en" ? "Current service alerts" : "临时状态提示"}>
          <span className="eyebrow">{language === "en" ? "TEMPORARY SERVICE ALERT" : "临时状态提示"}</span>
          {serviceAlerts.map((alert) => (
            <a className="service-alert" href={alert.source} target="_blank" rel="noreferrer" key={alert.venue}>
              <strong>{alert.venue}</strong>
              <p>{alert[language]}</p>
              <small>{alert.checked}</small>
            </a>
          ))}
        </section>
      )}

      <aside className="notice">
        <strong>{text.noticeTitle}</strong>
        <p>{text.notice}</p>
      </aside>

      <footer>
        <span>{text.footer}</span>
        <span>{text.nextUpdate}: {language === "en" ? "Mondays and Thursdays" : "每周一、周四"}</span>
      </footer>
    </main>
  );
}
