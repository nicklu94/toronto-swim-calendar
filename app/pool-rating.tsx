"use client";

import { useEffect, useState } from "react";

const tagOptions = [
  { value: "Quiet", zh: "人少" },
  { value: "Comfortable water", zh: "水温舒服" },
  { value: "Clean change room", zh: "更衣室干净" },
  { value: "Friendly staff", zh: "工作人员友好" },
  { value: "Good for lane swim", zh: "适合 Lane Swim" },
  { value: "Easy parking", zh: "停车方便" },
  { value: "Crowded", zh: "比较拥挤" },
  { value: "Cold water", zh: "水温偏冷" },
  { value: "Strong chlorine", zh: "氯味重" },
  { value: "Dated change room", zh: "更衣室偏旧" },
  { value: "Average showers", zh: "淋浴一般" },
  { value: "Lanes often full", zh: "泳道经常满" },
  { value: "Difficult parking", zh: "停车困难" },
  { value: "Lots of children", zh: "儿童很多" },
  { value: "Universal change room", zh: "无障碍／通用更衣室" },
  { value: "Outdoor pool", zh: "露天泳池" },
  { value: "Indoor pool", zh: "室内泳池" },
] as const;

type Stats = {
  average: number | null;
  total: number;
  tagCounts: Record<string, number>;
};

const emptyStats: Stats = { average: null, total: 0, tagCounts: {} };

function getVoterToken() {
  const key = "swim-rating-voter-token";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const token = window.crypto.randomUUID();
  window.localStorage.setItem(key, token);
  return token;
}

export function PoolRating({ venueId, venueName, language }: { venueId: string; venueName: string; language: "zh" | "en" }) {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [stars, setStars] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/ratings?venueId=${encodeURIComponent(venueId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<Stats>;
      })
      .then((result) => { if (active) setStats(result); })
      .catch(() => { if (active) setMessage(language === "en" ? "Ratings are temporarily unavailable." : "评分暂时无法加载。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language, venueId]);

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  async function submitRating() {
    if (stars == null) {
      setMessage(language === "en" ? "Choose a rating from 0 to 5." : "请选择 0 到 5 颗星。");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, stars, tags, voterToken: getVoterToken() }),
      });
      const result = await response.json() as Stats & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setStats(result);
      setMessage(language === "en" ? "Thanks — your rating was saved." : "谢谢，你的评分已保存。");
    } catch {
      setMessage(language === "en" ? "Your rating could not be saved. Please try again." : "评分保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rating-panel" aria-labelledby="rating-title">
      <div className="rating-summary">
        <span className="eyebrow">{language === "en" ? "COMMUNITY RATING" : "社区评分"}</span>
        <h2 id="rating-title">{venueName}</h2>
        <div className="rating-score">
          <strong>{loading ? "…" : stats.average ?? "—"}</strong>
          <span>{language === "en" ? `out of 5 · ${stats.total} rating${stats.total === 1 ? "" : "s"}` : `满分 5 分 · ${stats.total} 份评分`}</span>
        </div>
      </div>
      <div className="rating-form">
        <span>{language === "en" ? "Your rating" : "你的评分"}</span>
        <div className="star-picker" role="radiogroup" aria-label={language === "en" ? "Rating from zero to five stars" : "0 到 5 星评分"}>
          <button type="button" className={stars === 0 ? "active zero-star" : "zero-star"} onClick={() => setStars(0)} role="radio" aria-checked={stars === 0}>0</button>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              className={stars != null && stars >= value ? "active" : ""}
              onClick={() => setStars(value)}
              role="radio"
              aria-checked={stars === value}
              aria-label={`${value} ${language === "en" ? "stars" : "星"}`}
            >★</button>
          ))}
        </div>
        <span>{language === "en" ? "Optional tags" : "可选标签"}</span>
        <div className="rating-tags">
          {tagOptions.map((tag) => (
            <button type="button" key={tag.value} className={tags.includes(tag.value) ? "active" : ""} onClick={() => toggleTag(tag.value)}>
              {language === "en" ? tag.value : tag.zh}
              {stats.tagCounts[tag.value] ? <small>{stats.tagCounts[tag.value]}</small> : null}
            </button>
          ))}
        </div>
        <button className="rating-submit" type="button" onClick={submitRating} disabled={saving || loading}>
          {saving ? (language === "en" ? "Saving…" : "保存中…") : (language === "en" ? "Submit rating" : "提交评分")}
        </button>
        <p className="rating-message" aria-live="polite">{message || (language === "en" ? "One rating per browser per pool; submitting again updates it." : "每个浏览器对每个泳池计一份评分，再次提交会更新原评分。")}</p>
      </div>
    </section>
  );
}
