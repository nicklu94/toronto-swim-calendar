"use client";

import { useMemo, useState } from "react";
import { schedule, venues, week } from "./schedule-data";

const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]));
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
  const [selected, setSelected] = useState("all");
  const [postalCode, setPostalCode] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radiusKm, setRadiusKm] = useState(8);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const venueDistances = useMemo(() => new Map(venues.map((venue) => [
    venue.id,
    origin ? distanceKm(origin, venue) : null,
  ])), [origin]);

  const filteredVenues = useMemo(
    () => origin ? venues.filter((venue) => (venueDistances.get(venue.id) ?? Infinity) <= radiusKm) : venues,
    [origin, radiusKm, venueDistances]
  );
  const filteredVenueIds = useMemo(() => new Set(filteredVenues.map((venue) => venue.id)), [filteredVenues]);

  const visible = useMemo(
    () => [...schedule]
      .filter((item) => filteredVenueIds.has(item.venue))
      .filter((item) => selected === "all" || item.venue === selected)
      .sort((a, b) =>
        a.day - b.day ||
        timeToMinutes(a.start) - timeToMinutes(b.start) ||
        (venueNames.get(a.venue) ?? "").localeCompare(venueNames.get(b.venue) ?? "", "en-CA")
      ),
    [filteredVenueIds, selected]
  );

  const count = visible.length;

  async function locate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/geocode?postalCode=${encodeURIComponent(postalCode)}`);
      const result = await response.json() as Origin & { error?: string };
      if (!response.ok) throw new Error(result.error || "无法查询这个邮编。");
      setOrigin(result);
      setPostalCode(result.postalCode);
      setSelected("all");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "无法查询这个邮编。");
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
          <a className="brand" href="#top" aria-label="泳池周历首页">
            <span className="brand-mark">游</span>
            <span>泳池周历</span>
          </a>
          <span className="updated">每周更新 · {week.updatedLabel}</span>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow">TORONTO · RECREATIONAL SWIM</p>
          <h1>这周，什么时候<br />可以去游泳？</h1>
          <p className="dek">把北约克和士嘉堡市营公共泳池的免费 Leisure Swim 时段放在同一张日历里。少找网页，多下水。</p>
        </div>

        <div className="week-meta">
          <div><span>本周</span><strong>{week.rangeLabel}</strong></div>
          <div><span>开放时段</span><strong>{count} 个</strong></div>
          <div><span>泳池地点</span><strong>{filteredVenues.length} 个</strong></div>
        </div>
      </header>

      <section className="controls" aria-label="日历筛选">
        <form className="locator" onSubmit={locate}>
          <label className="postal-field">
            <span>你的邮编</span>
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value.toUpperCase())}
              placeholder="例如 M1P 4P5"
              inputMode="text"
              autoComplete="postal-code"
              maxLength={7}
              aria-describedby="postal-privacy postal-status"
            />
          </label>
          <button className="locate-button" type="submit" disabled={searching}>{searching ? "查询中…" : "查找泳池"}</button>
          {origin && <button className="clear-button" type="button" onClick={clearLocation}>显示全部</button>}
          <label className="radius-field">
            <span>距离范围 <strong>{radiusKm} km</strong></span>
            <input type="range" min="1" max="30" step="1" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} />
          </label>
          <small id="postal-privacy">邮编不会保存；距离按前三位邮区中心近似计算。</small>
          <p id="postal-status" className={searchError ? "locator-status error" : "locator-status"} aria-live="polite">
            {searchError || (origin
              ? `已使用 ${origin.postalCode.slice(0, 3)} 邮区的近似中心，显示 ${radiusKm} km 内的 ${filteredVenues.length} 个地点。`
              : "输入邮编后拖动滑杆，缩小日历范围。")}
          </p>
        </form>
        <div className="venue-tabs" role="group" aria-label="按地点筛选">
          <button className={selected === "all" ? "active" : ""} onClick={() => setSelected("all")}>全部地点</button>
          {filteredVenues.map((venue) => (
            <button key={venue.id} className={selected === venue.id ? "active" : ""} onClick={() => setSelected(venue.id)}>
              {venue.shortName}{origin && <small>{venueDistances.get(venue.id)?.toFixed(1)} km</small>}
            </button>
          ))}
        </div>
      </section>

      <section className="calendar" aria-label={`${week.rangeLabel}游泳日历`}>
        {dayNames.map((day, dayIndex) => {
          const items = visible.filter((item) => item.day === dayIndex);
          const isToday = week.todayIndex === dayIndex;
          return (
            <article className={`day ${isToday ? "today" : ""}`} key={day}>
              <div className="day-heading">
                <span>{day}</span>
                <strong>{week.dates[dayIndex]}</strong>
                {isToday && <em>今天</em>}
              </div>
              <div className="slots">
                {items.length === 0 ? <p className="empty">暂无开放时段</p> : items.map((item, index) => {
                  const venue = venues.find((entry) => entry.id === item.venue)!;
                  return (
                    <a className="slot" style={{"--venue": venue.color} as React.CSSProperties} href={venue.source} target="_blank" rel="noreferrer" key={`${item.venue}-${item.start}-${index}`}>
                      <span className="slot-venue">{venue.shortName}</span>
                      <strong>{item.start}<i>—</i>{item.end}</strong>
                      <small>免费开放游泳</small>
                    </a>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="locations">
        <div className="section-title">
          <p className="eyebrow">LOCATIONS & SOURCES</p>
          <h2>地点与官方来源</h2>
        </div>
        <div className="location-grid">
          {filteredVenues.map((venue) => (
            <a className="location-card" href={venue.source} target="_blank" rel="noreferrer" key={venue.id}>
              <span className="location-number">{String(filteredVenues.indexOf(venue) + 1).padStart(2, "0")}</span>
              <div>
                <h3>{venue.name}</h3>
                <p>{venue.district} · 官方排期{origin && ` · ${venueDistances.get(venue.id)?.toFixed(1)} km`}</p>
              </div>
              <span className="arrow">↗</span>
            </a>
          ))}
          {filteredVenues.length === 0 && <p className="no-locations">这个范围内没有收录的泳池，请把距离调大一些。</p>}
        </div>
      </section>

      <aside className="notice">
        <strong>出发前请再点开官方排期确认。</strong>
        <p>临时维修、天气、假日安排和泳池容量可能导致当天变动。页面收录北约克和士嘉堡市营社区中心、合作校池及独立公共泳池的免费 Leisure Swim；不收录 YMCA、Lane Swim 或其他收费项目。</p>
      </aside>

      <footer>
        <span>泳池周历 · Toronto</span>
        <span>下一次计划更新：{week.nextUpdateLabel}</span>
      </footer>
    </main>
  );
}
