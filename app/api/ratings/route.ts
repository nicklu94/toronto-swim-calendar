import { getD1 } from "../../../db";
import { regionalVenues } from "../../regional-schedule-data";
import { venues } from "../../schedule-data";

const allowedVenueIds = new Set([...venues, ...regionalVenues].map((venue) => venue.id));
const allowedTags = [
  "Quiet",
  "Comfortable water",
  "Clean change room",
  "Friendly staff",
  "Good for lane swim",
  "Easy parking",
  "Crowded",
  "Cold water",
  "Strong chlorine",
  "Dated change room",
  "Average showers",
  "Lanes often full",
  "Difficult parking",
  "Lots of children",
] as const;
const allowedTagSet = new Set<string>(allowedTags);

type RatingStats = {
  average: number | null;
  total: number;
  tagCounts: Record<string, number>;
};

function validateVenueId(value: unknown) {
  return typeof value === "string" && allowedVenueIds.has(value) ? value : null;
}

async function getStats(venueId: string): Promise<RatingStats> {
  const db = getD1();
  const summary = await db
    .prepare("SELECT COUNT(*) AS total, AVG(stars) AS average FROM pool_ratings WHERE venue_id = ?")
    .bind(venueId)
    .first<{ total: number; average: number | null }>();
  const rows = await db
    .prepare("SELECT tags FROM pool_ratings WHERE venue_id = ?")
    .bind(venueId)
    .all<{ tags: string }>();

  const tagCounts = Object.fromEntries(allowedTags.map((tag) => [tag, 0]));
  for (const row of rows.results) {
    try {
      const tags = JSON.parse(row.tags) as unknown;
      if (!Array.isArray(tags)) continue;
      for (const tag of tags) {
        if (typeof tag === "string" && allowedTagSet.has(tag)) tagCounts[tag] += 1;
      }
    } catch {
      // Ignore a malformed legacy row rather than hiding all aggregate ratings.
    }
  }

  return {
    average: summary?.average == null ? null : Math.round(Number(summary.average) * 10) / 10,
    total: Number(summary?.total ?? 0),
    tagCounts,
  };
}

export async function GET(request: Request) {
  try {
    const venueId = validateVenueId(new URL(request.url).searchParams.get("venueId"));
    if (!venueId) return Response.json({ error: "Invalid pool." }, { status: 400 });
    return Response.json(await getStats(venueId), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Ratings are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      venueId?: unknown;
      voterToken?: unknown;
      stars?: unknown;
      tags?: unknown;
    };
    const venueId = validateVenueId(payload.venueId);
    const voterToken = typeof payload.voterToken === "string" && /^[a-f0-9-]{20,80}$/i.test(payload.voterToken)
      ? payload.voterToken
      : null;
    const stars = typeof payload.stars === "number" && Number.isInteger(payload.stars) && payload.stars >= 0 && payload.stars <= 5
      ? payload.stars
      : null;
    const tags = Array.isArray(payload.tags)
      ? [...new Set(payload.tags.filter((tag): tag is string => typeof tag === "string" && allowedTagSet.has(tag)))]
      : [];

    if (!venueId || !voterToken || stars == null) {
      return Response.json({ error: "Invalid rating." }, { status: 400 });
    }

    const db = getD1();
    await db.prepare(`
      INSERT INTO pool_ratings (venue_id, voter_token, stars, tags)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(venue_id, voter_token) DO UPDATE SET
        stars = excluded.stars,
        tags = excluded.tags,
        updated_at = CURRENT_TIMESTAMP
    `).bind(venueId, voterToken, stars, JSON.stringify(tags)).run();

    return Response.json(await getStats(venueId), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Your rating could not be saved." }, { status: 503 });
  }
}
