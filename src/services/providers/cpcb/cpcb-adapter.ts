// SPDX-License-Identifier: Apache-2.0
import type {
  AirQualityProvider,
  ProviderCapabilities,
  StationSearchQuery,
  ObservationQuery,
  ForecastQuery,
  ProviderStationResult,
  ProviderObservationResult,
  ProviderForecastResult
} from "../types";
import { CpcbClient, type CpcbClientOptions } from "./cpcb-client";
import type { CpcbRawRecord } from "@/schemas/providers/cpcb-upstream.schema";
import type {
  NormalizedStation,
  NormalizedObservation,
  PollutantType
} from "@/schemas/providers/normalized-provider.schema";

const CPCB_LICENSE = "Government Open Data License - India (GODL-India)";
const CPCB_ATTRIBUTION = "Central Pollution Control Board (CPCB) / data.gov.in under GODL-India";

export class CpcbAdapter implements AirQualityProvider {
  public readonly providerId = "CPCB_CAAQMS";
  private readonly client: CpcbClient;

  constructor(options: CpcbClientOptions = {}) {
    this.client = new CpcbClient(options);
  }

  public async getCapabilities(): Promise<ProviderCapabilities> {
    return {
      providerId: this.providerId,
      displayName: "CPCB CAAQMS / data.gov.in",
      providesGroundObservations: true,
      providesAtmosphericForecast: false,
      providesStationSearch: true,
      rateLimitPerMinute: 60,
      defaultCacheTtlSeconds: 600, // 10 minutes
      legalLicense: CPCB_LICENSE,
      mandatoryAttribution: CPCB_ATTRIBUTION
    };
  }

  public static mapPollutantId(rawId: string): PollutantType | null {
    const norm = rawId.trim().toUpperCase().replace(/[\s\.\-_]/g, "");
    switch (norm) {
      case "PM25":
        return "PM2.5";
      case "PM10":
        return "PM10";
      case "NO2":
        return "NO2";
      case "SO2":
        return "SO2";
      case "CO":
        return "CO";
      case "OZONE":
      case "O3":
        return "O3";
      case "NH3":
        return "NH3";
      case "PB":
      case "LEAD":
        return "Pb";
      default:
        return null;
    }
  }

  public static parseCpcbTimestamp(rawDateStr: string | null | undefined): string | null {
    if (!rawDateStr || typeof rawDateStr !== "string") return null;
    const trimmed = rawDateStr.trim();
    if (!trimmed || trimmed === "NA" || trimmed === "None") return null;

    // Format DD-MM-YYYY HH:mm:ss
    const ddmmyyyy = /^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
    if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3] && ddmmyyyy[4] && ddmmyyyy[5] && ddmmyyyy[6]) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const hour = parseInt(ddmmyyyy[4], 10);
      const min = parseInt(ddmmyyyy[5], 10);
      const sec = parseInt(ddmmyyyy[6], 10);
      // Indian Standard Time (IST) is UTC+05:30. CPCB feeds publish local time.
      const dateUtc = new Date(Date.UTC(year, month, day, hour - 5, min - 30, sec));
      if (!isNaN(dateUtc.getTime())) {
        return dateUtc.toISOString();
      }
    }

    // Try standard ISO
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return null;
  }

  public static normalizePollutantUnit(
    rawUnit: string | null | undefined,
    pollutant: PollutantType
  ): {
    verifiedUnit: "µg/m³" | "mg/m³" | null;
    rawUnit: string | null;
    isVerified: boolean;
    convertedValueMultiplier: number;
  } {
    if (!rawUnit || typeof rawUnit !== "string") {
      return { verifiedUnit: null, rawUnit: null, isVerified: false, convertedValueMultiplier: 1.0 };
    }
    const trimmed = rawUnit.trim();
    if (!trimmed || trimmed === "NA" || trimmed === "None") {
      return { verifiedUnit: null, rawUnit: null, isVerified: false, convertedValueMultiplier: 1.0 };
    }

    const norm = trimmed.toLowerCase().replace(/[\s\-_]/g, "");
    if (norm === "µg/m3" || norm === "ug/m3" || norm === "µg/m³" || norm === "microgram/m3") {
      return { verifiedUnit: "µg/m³", rawUnit: trimmed, isVerified: true, convertedValueMultiplier: 1.0 };
    }
    if (norm === "mg/m3" || norm === "mg/m³" || norm === "milligram/m3") {
      return { verifiedUnit: "mg/m³", rawUnit: trimmed, isVerified: true, convertedValueMultiplier: 1.0 };
    }
    if (norm === "ppm" && pollutant === "CO") {
      // Verified source unit conversion: 1 ppm CO ≈ 1.145 mg/m³ at 25°C 1 atm
      return { verifiedUnit: "mg/m³", rawUnit: trimmed, isVerified: true, convertedValueMultiplier: 1.145 };
    }
    if (norm === "ppb" && pollutant === "NO2") {
      // Verified source unit conversion: 1 ppb NO2 ≈ 1.88 µg/m³ at 25°C 1 atm
      return { verifiedUnit: "µg/m³", rawUnit: trimmed, isVerified: true, convertedValueMultiplier: 1.88 };
    }

    return { verifiedUnit: null, rawUnit: trimmed, isVerified: false, convertedValueMultiplier: 1.0 };
  }

  public static computeHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  public static normalizeStationId(state: string, city: string, station: string): string {
    const slug = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `cpcb_${slug(state)}_${slug(city)}_${slug(station)}`;
  }

  public processRecords(
    records: readonly CpcbRawRecord[],
    retrievalTime: string
  ): {
    stations: NormalizedStation[];
    observations: NormalizedObservation[];
    warnings: string[];
  } {
    const stationMap = new Map<
      string,
      {
        id: string;
        name: string;
        city: string;
        state: string;
        latitude: number;
        longitude: number;
        availablePollutants: Set<PollutantType>;
        lastReportedAt: string | null;
      }
    >();

    const observations: NormalizedObservation[] = [];
    const warnings: string[] = [];

    for (const record of records) {
      if (!record.station || !record.city || !record.state) {
        continue;
      }

      const lat =
        typeof record.latitude === "number"
          ? record.latitude
          : record.latitude
            ? parseFloat(record.latitude)
            : NaN;
      const lon =
        typeof record.longitude === "number"
          ? record.longitude
          : record.longitude
            ? parseFloat(record.longitude)
            : NaN;

      if (isNaN(lat) || isNaN(lon) || lat < 6.0 || lat > 38.0 || lon < 68.0 || lon > 98.0) {
        // Skip records with invalid/missing coordinates outside India bounds
        continue;
      }

      const stationId = CpcbAdapter.normalizeStationId(record.state, record.city, record.station);
      const pollutant = CpcbAdapter.mapPollutantId(record.pollutant_id);
      if (!pollutant) {
        warnings.push(`Unknown pollutant_id '${record.pollutant_id}' at station '${record.station}'`);
        continue;
      }

      const obsTime = CpcbAdapter.parseCpcbTimestamp(record.last_update);
      const rawAvg = record.pollutant_avg?.trim();
      const rawNum = rawAvg && rawAvg !== "NA" && rawAvg !== "None" ? parseFloat(rawAvg) : NaN;
      const rawValue: number | null = isNaN(rawNum) ? null : rawNum;

      // Extract and verify pollutant unit without inventing missing units
      const unitInfo = CpcbAdapter.normalizePollutantUnit(record.pollutant_unit, pollutant);
      let numValue = rawNum;
      if (!isNaN(numValue) && unitInfo.convertedValueMultiplier !== 1.0) {
        numValue = Math.round(numValue * unitInfo.convertedValueMultiplier * 100) / 100;
      }

      let entry = stationMap.get(stationId);
      if (!entry) {
        entry = {
          id: stationId,
          name: record.station.trim(),
          city: record.city.trim(),
          state: record.state.trim(),
          latitude: lat,
          longitude: lon,
          availablePollutants: new Set(),
          lastReportedAt: obsTime
        };
        stationMap.set(stationId, entry);
      }

      entry.availablePollutants.add(pollutant);
      if (obsTime && (!entry.lastReportedAt || obsTime > entry.lastReportedAt)) {
        entry.lastReportedAt = obsTime;
      }

      if (!isNaN(numValue) && numValue >= 0 && obsTime) {
        const obsDate = new Date(obsTime).getTime();
        const retDate = new Date(retrievalTime).getTime();
        const ageHours = !isNaN(obsDate) && !isNaN(retDate) ? (retDate - obsDate) / (1000 * 60 * 60) : NaN;

        let qualityFlag: "VERIFIED" | "PROVISIONAL" | "SUSPICIOUS" | "STALE" = "VERIFIED";
        if (numValue > 2500) {
          qualityFlag = "SUSPICIOUS";
        } else if (!unitInfo.isVerified) {
          qualityFlag = "PROVISIONAL";
        } else if (!isNaN(ageHours) && ageHours > 24) {
          qualityFlag = "STALE";
        } else if (!isNaN(ageHours) && ageHours > 4) {
          qualityFlag = "PROVISIONAL";
        }

        observations.push({
          id: `${stationId}_${pollutant}_${obsTime}`,
          stationId,
          stationName: record.station.trim(),
          providerId: this.providerId,
          pollutant,
          value: numValue,
          unit: unitInfo.verifiedUnit, // Null if missing/unverified - never invented
          rawUnit: unitInfo.rawUnit,
          rawValue,
          rawRecord: record as unknown as Record<string, unknown>,
          averagingPeriod: "UNKNOWN", // Strictly UNKNOWN per CPCB telemetry restrictions
          typology: "TYPE_C_RAW_MEASUREMENT",
          observationTime: obsTime,
          sourceUpdateTime: record.last_update || null,
          retrievalTime,
          qualityFlag,
          license: CPCB_LICENSE,
          attribution: CPCB_ATTRIBUTION
        });
      }
    }

    const stations: NormalizedStation[] = Array.from(stationMap.values()).map((s) => ({
      id: s.id,
      providerId: this.providerId,
      name: s.name,
      city: s.city,
      state: s.state,
      latitude: s.latitude,
      longitude: s.longitude,
      availablePollutants: Array.from(s.availablePollutants),
      lastReportedAt: s.lastReportedAt,
      license: CPCB_LICENSE,
      attribution: CPCB_ATTRIBUTION
    }));

    return { stations, observations, warnings };
  }

  public async searchStations(query: StationSearchQuery): Promise<ProviderStationResult> {
    const retrievedAt = new Date().toISOString();
    if (!this.client.isConfigured()) {
      return {
        providerId: this.providerId,
        stations: [],
        retrievedAt,
        status: "NOT_CONFIGURED",
        warnings: ["CPCB provider is NOT_CONFIGURED (DATA_GOV_IN_API_KEY missing)"]
      };
    }

    try {
      const response = await this.client.fetchRawData({ limit: query.limit ?? 1000 });
      const { stations, warnings } = this.processRecords(response.records, retrievedAt);

      let filtered = stations;
      if (query.query) {
        const q = query.query.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q) ||
            s.state.toLowerCase().includes(q)
        );
      }

      if (query.latitude !== undefined && query.longitude !== undefined) {
        const radius = query.radiusKm ?? 50;
        filtered = filtered
          .map((s) => ({
            ...s,
            distanceKm: CpcbAdapter.computeHaversineDistanceKm(
              query.latitude!,
              query.longitude!,
              s.latitude,
              s.longitude
            )
          }))
          .filter((s) => s.distanceKm! <= radius)
          .sort((a, b) => a.distanceKm! - b.distanceKm!);
      }

      return {
        providerId: this.providerId,
        stations: filtered,
        retrievedAt,
        status: "CONFIGURED",
        warnings
      };
    } catch (err: unknown) {
      return {
        providerId: this.providerId,
        stations: [],
        retrievedAt,
        status: "UNAVAILABLE",
        warnings: [err instanceof Error ? err.message : String(err)]
      };
    }
  }

  public async getObservations(query: ObservationQuery): Promise<ProviderObservationResult> {
    const retrievedAt = new Date().toISOString();
    if (!this.client.isConfigured()) {
      return {
        providerId: this.providerId,
        observations: [],
        retrievedAt,
        status: "NOT_CONFIGURED",
        warnings: ["CPCB provider is NOT_CONFIGURED (DATA_GOV_IN_API_KEY missing)"]
      };
    }

    try {
      const response = await this.client.fetchRawData({ limit: 1000 });
      const { observations, warnings } = this.processRecords(response.records, retrievedAt);

      let filtered = observations;
      if (query.stationId) {
        filtered = filtered.filter((o) => o.stationId === query.stationId);
      }

      return {
        providerId: this.providerId,
        observations: filtered,
        retrievedAt,
        status: "CONFIGURED",
        warnings
      };
    } catch (err: unknown) {
      return {
        providerId: this.providerId,
        observations: [],
        retrievedAt,
        status: "UNAVAILABLE",
        warnings: [err instanceof Error ? err.message : String(err)]
      };
    }
  }

  public async getForecast(_query: ForecastQuery): Promise<ProviderForecastResult> {
    return {
      providerId: this.providerId,
      forecast: [],
      modelDomain: "NONE",
      spatialResolutionKm: 0,
      temporalResolutionHours: 0,
      retrievedAt: new Date().toISOString(),
      status: this.client.isConfigured() ? "CONFIGURED" : "NOT_CONFIGURED",
      warnings: ["CPCB CAAQMS does not provide atmospheric forecast models."]
    };
  }
}
