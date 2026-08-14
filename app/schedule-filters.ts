export type PoolSettingFilter = "all" | "indoor" | "outdoor";

// These facilities are listed as outdoor pools in their municipalities' pool guides.
// The remaining venues in the calendar are treated as indoor facilities.
export const outdoorVenueIds = new Set([
  "gord-and-irene-risk-community-recreation-centre",
  "goulding-community-recreation-centre",
  "grandravine-community-recreation-centre",
  "heron-park-community-recreation-centre",
  "maryvale-park",
  "mcgregor-park-community-centre",
  "o-connor-community-centre",
  "regional-markham-morgan-pool",
  "regional-markham-rouge-river-community-centre",
  "regional-vaughan-thornhill-outdoor-pool",
]);

export function poolSettingForVenue(venueId: string): Exclude<PoolSettingFilter, "all"> {
  return outdoorVenueIds.has(venueId) ? "outdoor" : "indoor";
}

export function matchesTimeWindow(
  session: { start: string; end: string },
  earliestStart: string,
  latestEnd: string,
) {
  if (earliestStart && latestEnd && earliestStart > latestEnd) return false;
  if (earliestStart && session.start < earliestStart) return false;
  if (latestEnd && session.end > latestEnd) return false;
  return true;
}
