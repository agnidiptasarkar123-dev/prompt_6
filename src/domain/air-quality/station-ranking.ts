// SPDX-License-Identifier: Apache-2.0
import type { NormalizedStation } from "@/schemas/providers/normalized-provider.schema";

const AGENCY_SUFFIX_RE =
  /\s*-\s*(wbpcb|wbspcb|cpcb|dpcc|bspcb|uppcb|mpcb|kspcb|tnpcb|gpcb|hspcb|pspcb|appcb|tspcb)\b/g;

function normalizeSiteName(name: string): string {
  return name
    .toLowerCase()
    .replace(AGENCY_SUFFIX_RE, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Determines whether two monitoring station records represent the same physical
 * station (matched by ID, stripped agency name, or proximity under 250 m).
 */
export function isSamePhysicalSite(a: NormalizedStation, b: NormalizedStation): boolean {
  if (a.id === b.id) return true;
  if (normalizeSiteName(a.name) === normalizeSiteName(b.name)) return true;

  const dLat = (a.latitude - b.latitude) * (Math.PI / 180);
  const dLon = (a.longitude - b.longitude) * (Math.PI / 180);
  const lat1 = b.latitude * (Math.PI / 180);
  const lat2 = a.latitude * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const distKm = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return distKm < 0.25;
}

export function isAqiEligibleStation(station: NormalizedStation): boolean {
  return (
    station.availablePollutants.length >= 3 &&
    (station.availablePollutants.includes("PM2.5") || station.availablePollutants.includes("PM10"))
  );
}

/**
 * Picks the highest-priority monitoring station for initial city load:
 * recent valid OpenAQ -> recent valid PM-eligible -> recent valid -> closest.
 */
export function pickPreferredStation(
  foundStations: readonly NormalizedStation[],
  nowMs: number = Date.now()
): NormalizedStation | null {
  if (foundStations.length === 0) return null;

  const isRecentValid = (s: NormalizedStation) => {
    if (!s.lastReportedAt) return false;
    const ms = new Date(s.lastReportedAt).getTime();
    return !isNaN(ms) && nowMs - ms <= 48 * 3600 * 1000 && ms - nowMs <= 5 * 60 * 1000;
  };

  return (
    foundStations.find((s) => isRecentValid(s) && isAqiEligibleStation(s) && s.providerId === "OPENAQ") ??
    foundStations.find((s) => isRecentValid(s) && isAqiEligibleStation(s)) ??
    foundStations.find((s) => isRecentValid(s)) ??
    foundStations[0]!
  );
}

/**
 * Selects the best alternative nearby station representing a different physical
 * monitoring site from the currently selected station.
 */
export function selectAlternativeStation(
  stations: readonly NormalizedStation[],
  selectedStation: NormalizedStation | null,
  retrievedAt?: string
): NormalizedStation | null {
  const refMs = retrievedAt ? new Date(retrievedAt).getTime() : NaN;
  const candidates = stations.filter((s) => {
    if (selectedStation && isSamePhysicalSite(s, selectedStation)) return false;
    if (s.availablePollutants.length === 0) return false;
    if (!isNaN(refMs) && s.lastReportedAt) {
      const repMs = new Date(s.lastReportedAt).getTime();
      if (!isNaN(repMs) && repMs - refMs > 5 * 60 * 1000) return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  const isFresh = (s: NormalizedStation) => {
    if (isNaN(refMs) || !s.lastReportedAt) return false;
    const ms = new Date(s.lastReportedAt).getTime();
    return !isNaN(ms) && refMs - ms <= 24 * 3600 * 1000;
  };

  return (
    candidates.find((s) => isAqiEligibleStation(s) && isFresh(s) && s.providerId === "OPENAQ") ??
    candidates.find((s) => isAqiEligibleStation(s) && isFresh(s)) ??
    candidates.find((s) => isAqiEligibleStation(s)) ??
    candidates.find((s) => isFresh(s)) ??
    candidates[0]!
  );
}
