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

export function sessionContainsTime(session: { start: string; end: string }, selectedTime: string) {
  if (!selectedTime) return true;
  return session.start <= selectedTime && selectedTime < session.end;
}
