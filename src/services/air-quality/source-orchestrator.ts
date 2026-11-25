// SPDX-License-Identifier: Apache-2.0
import type { AirQualityProvider } from "../providers/types";
import { CpcbAdapter } from "../providers/cpcb/cpcb-adapter";
import { OpenAQAdapter } from "../providers/openaq/openaq-adapter";
import { OpenMeteoAdapter } from "../providers/open-meteo/open-meteo-adapter";
import { CacheService, globalCacheService } from "../cache/cache-service";
import { CircuitBreaker } from "@/lib/http/circuit-breaker";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast,
  PollutantType
} from "@/schemas/providers/normalized-provider.schema";
import { calculateStationCpcbAqi } from "@/domain/cpcb/cpcb-engine";
import { createValidatedAggregatedMeasurement } from "@/domain/cpcb/rolling-window-aggregator";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { ValidatedAggregatedMeasurement } from "@/schemas/pollutant.schema";

export interface StationAirQualityResult {
  readonly station: NormalizedStation | null;
  readonly observations: readonly NormalizedObservation[];
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly partialSubIndices?: readonly CpcbAqiResult["subIndices"][number][];
  readonly aqiStatus: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE";
  readonly statusMessage: string;
  readonly provider: string;
  readonly retrievedAt: string;
  readonly warnings: readonly string[];
}

export class SourceOrchestrator {
  private readonly cpcbProvider: AirQualityProvider;
  private readonly openaqProvider: AirQualityProvider;
  private readonly openMeteoProvider: AirQualityProvider;
  private readonly cacheService: CacheService;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(options: {
    cpcbProvider?: AirQualityProvider;
    openaqProvider?: AirQualityProvider;
    openMeteoProvider?: AirQualityProvider;
    cacheService?: CacheService;
  } = {}) {
    this.cpcbProvider =
      options.cpcbProvider ||
      new CpcbAdapter({
        apiKey: process.env["DATA_GOV_IN_API_KEY"]
      });
    this.openaqProvider =
      options.openaqProvider ||
      new OpenAQAdapter({
        apiKey: process.env["OPENAQ_API_KEY"]
      });
    this.openMeteoProvider = options.openMeteoProvider || new OpenMeteoAdapter();
    this.cacheService = options.cacheService || globalCacheService;

    this.circuitBreakers.set("CPCB_CAAQMS", new CircuitBreaker());
    this.circuitBreakers.set("OPENAQ", new CircuitBreaker());
    this.circuitBreakers.set("OPEN_METEO_CAMS", new CircuitBreaker());
  }

  public async searchNearbyStations(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    query?: string;
  }): Promise<{
    stations: readonly NormalizedStation[];
    warnings: readonly string[];
  }> {
    const radiusKm = params.radiusKm ?? 50;
    const cacheKey = this.cacheService.buildKey(
      "stations_nearby",
      `${params.latitude.toFixed(2)}_${params.longitude.toFixed(2)}_${radiusKm}_${params.query || "all"}`
    );

    const { data } = await this.cacheService.getOrSet(cacheKey, 600, async () => {
      const warnings: string[] = [];
      const allStations: NormalizedStation[] = [];

      // 1. Query CPCB
      const cpcbBreaker = this.circuitBreakers.get("CPCB_CAAQMS")!;
      if (cpcbBreaker.canExecute()) {
        try {
          const res = await this.cpcbProvider.searchStations({
            latitude: params.latitude,
            longitude: params.longitude,
            radiusKm,
            query: params.query
          });
          if (res.status === "CONFIGURED") {
            cpcbBreaker.recordSuccess();
            allStations.push(...res.stations);
          } else {
            warnings.push(...res.warnings);
          }
        } catch (err: unknown) {
          cpcbBreaker.recordFailure();
          warnings.push(`CPCB fetch failed: ${String(err)}`);
        }
      } else {
        warnings.push("CPCB circuit breaker is OPEN: Circuit breaker open for CPCB_CAAQMS (service temporarily degraded)");
      }

      // 2. Query OpenAQ
      const openaqBreaker = this.circuitBreakers.get("OPENAQ")!;
      if (openaqBreaker.canExecute()) {
        try {
          const res = await this.openaqProvider.searchStations({
            latitude: params.latitude,
            longitude: params.longitude,
            radiusKm,
            query: params.query
          });
          if (res.status === "CONFIGURED") {
            openaqBreaker.recordSuccess();
            allStations.push(...res.stations);
          } else {
            warnings.push(...res.warnings);
          }
        } catch (err: unknown) {
          openaqBreaker.recordFailure();
          warnings.push(`OpenAQ fetch failed: ${String(err)}`);
        }
      } else {
        warnings.push("OpenAQ circuit breaker is OPEN: Circuit breaker open for OPENAQ (service temporarily degraded)");
      }

      // Sort stations strictly by distance
      allStations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

      return { stations: allStations, warnings };
    });

    return data;
  }

  public async getStationAirQuality(
    stationId: string,
    stationHint?: NormalizedStation,
    stationNameOverride?: string
  ): Promise<StationAirQualityResult> {
    const isCpcb = stationId.startsWith("cpcb_");
    const isOpenaq = stationId.startsWith("openaq_");

    if (!isCpcb && !isOpenaq) {
      return {
        station: null,
        observations: [],
        calculatedAqi: null,
        aqiStatus: "AQI_UNAVAILABLE",
        statusMessage: "Unknown or invalid provider prefix for station identifier.",
        provider: "UNKNOWN",
        retrievedAt: new Date().toISOString(),
        warnings: [`Unknown provider prefix for station '${stationId}'`]
      };
    }

    const provider = isCpcb ? this.cpcbProvider : this.openaqProvider;
    const providerId = isCpcb ? "CPCB_CAAQMS" : "OPENAQ";
    const cacheKey = this.cacheService.buildKey("aq_obs", stationId);

    const resolvedStationName = stationHint?.name || stationNameOverride;
    const { data } = await this.cacheService.getOrSet(cacheKey, 300, async () => {
      const res = await provider.getObservations(
        resolvedStationName ? { stationId, stationName: resolvedStationName } : { stationId }
      );
      return {
        observations: res.observations,
        warnings: res.warnings,
        retrievedAt: res.retrievedAt
      };
    });

    const observations = data.observations;
    const warnings = [...data.warnings];

    // Evaluate phase 1 CPCB Engine
    let calculatedAqi: CpcbAqiResult | null = null;
    let partialSubIndices: readonly CpcbAqiResult["subIndices"][number][] | undefined;
    let aqiStatus: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE" = "AQI_UNAVAILABLE";
    let statusMessage = "Overall CPCB AQI unavailable: fewer than 3 valid pollutants monitored or missing particulate parameters.";

    // 1. Enforce strict station and provider isolation
    for (const obs of observations) {
      if (obs.stationId !== stationId) {
        throw new Error(
          `Station isolation violation: observation stationId '${obs.stationId}' does not match target '${stationId}'`
        );
      }
      if (obs.typology === "TYPE_D_MODEL_FORECAST") {
        throw new Error(
          "Typology isolation violation: atmospheric forecast cannot enter measured station observations"
        );
      }
    }

    // Group observations by pollutant
    const pollutantGroups = new Map<PollutantType, NormalizedObservation[]>();
    for (const obs of observations) {
      const list = pollutantGroups.get(obs.pollutant) || [];
      list.push(obs);
      pollutantGroups.set(obs.pollutant, list);
    }

    const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
    const refTimeMs = data.retrievedAt ? new Date(data.retrievedAt).getTime() : Date.now();

    // Exclude SUSPICIOUS (future-skewed / missing-timestamp / anomalous >2500) readings from AQI sub-index math
    const eligibleObsByPollutant = new Map<PollutantType, NormalizedObservation[]>();
    for (const [pol, list] of pollutantGroups.entries()) {
      const nonSuspicious = list.filter((o) => {
        if (o.qualityFlag === "SUSPICIOUS") return false;
        const obsMs = new Date(o.observationTime).getTime();
        return !isNaN(obsMs) && obsMs - refTimeMs <= MAX_CLOCK_SKEW_MS;
      });
      if (nonSuspicious.length > 0) {
        eligibleObsByPollutant.set(pol, nonSuspicious);
      }
    }

    // Evaluate all individual pollutant sub-indices first (even when overall AQI fails 3-pollutant/PM criteria)
    if (eligibleObsByPollutant.size > 0) {
      try {
        const validatedMeasurements: ValidatedAggregatedMeasurement[] = [];

        for (const [pol, obsList] of eligibleObsByPollutant.entries()) {
          const windowHours = pol === "CO" || pol === "O3" ? 8 : 24;
          const expectedUnit = pol === "CO" ? "mg/m³" : "µg/m³";

          // Collect observations with verified units, converting CO µg/m³ -> mg/m³ safely
          const convertedObs = obsList
            .map((o) => {
              if (o.unit === expectedUnit) {
                return { value: o.value, unit: expectedUnit, observationTime: o.observationTime, averagingPeriod: o.averagingPeriod };
              }
              if (pol === "CO" && o.unit === "µg/m³") {
                return {
                  value: Math.round((o.value / 1000) * 1000) / 1000,
                  unit: "mg/m³" as const,
                  observationTime: o.observationTime,
                  averagingPeriod: o.averagingPeriod
                };
              }
              return null;
            })
            .filter((item): item is { value: number; unit: "µg/m³" | "mg/m³"; observationTime: string; averagingPeriod: NormalizedObservation["averagingPeriod"] } => item !== null);

          if (convertedObs.length === 0) {
            warnings.push(`Skipping sub-index for ${pol}: unverified or missing unit.`);
            continue;
          }

          // Strict statutory CPCB NAQI completeness: >= 16 distinct hours in window OR verified 24h/8h upstream summary
          const isVerifiedStatutory = convertedObs.some(
            (o) => o.averagingPeriod === "24h" || (windowHours === 8 && o.averagingPeriod === "8h")
          );
          const hourlyEntries = Array.from(
            convertedObs
              .reduce((map, item) => {
                const hourBucket = item.observationTime.slice(0, 13);
                if (!map.has(hourBucket)) {
                  map.set(hourBucket, { time: item.observationTime, value: item.value });
                }
                return map;
              }, new Map<string, { time: string; value: number }>())
              .values()
          ).sort((a, b) => a.time.localeCompare(b.time));

          const validHoursInWindow = isVerifiedStatutory ? 16 : hourlyEntries.length;
          if (!isVerifiedStatutory && validHoursInWindow < 16) {
            warnings.push(
              `Skipping sub-index for ${pol}: insufficient hourly completeness (${validHoursInWindow}/16 statutory hours).`
            );
            continue;
          }

          let summaryConcentration: number;
          if (windowHours === 8 && hourlyEntries.length >= 8) {
            let max8h = -Infinity;
            for (let i = 0; i <= hourlyEntries.length - 8; i++) {
              const slice = hourlyEntries.slice(i, i + 8);
              const mean8 = slice.reduce((acc, e) => acc + e.value, 0) / slice.length;
              if (mean8 > max8h) max8h = mean8;
            }
            summaryConcentration = Math.round(max8h * 100) / 100;
          } else {
            summaryConcentration =
              Math.round((hourlyEntries.reduce((acc, e) => acc + e.value, 0) / hourlyEntries.length) * 100) / 100;
          }

          const latestValidObsTime = hourlyEntries[hourlyEntries.length - 1]!.time;
          const measurement = createValidatedAggregatedMeasurement({
            stationId,
            pollutant: pol,
            concentration: summaryConcentration,
            unit: expectedUnit,
            averagingWindowHours: windowHours,
            recordedAtUtc: latestValidObsTime,
            validHoursInWindow: windowHours === 8 ? Math.min(8, validHoursInWindow) : validHoursInWindow,
            completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H"
          });

          validatedMeasurements.push(measurement);
        }

        const eligibleHasParticulate = eligibleObsByPollutant.has("PM2.5") || eligibleObsByPollutant.has("PM10");
        if (validatedMeasurements.length > 0) {
          const stationResult = calculateStationCpcbAqi(stationId, validatedMeasurements, data.retrievedAt);
          if (stationResult.overallAqi !== null) {
            calculatedAqi = stationResult;
            // Check observation staleness (>24 hours)
            const latestObsTime = observations.reduce((latest, o) => {
              const t = new Date(o.observationTime).getTime();
              return !isNaN(t) && t <= refTimeMs + MAX_CLOCK_SKEW_MS && t > latest ? t : latest;
            }, 0);
            const isStale = latestObsTime > 0 && refTimeMs - latestObsTime > 24 * 60 * 60 * 1000;
            if (isStale) {
              aqiStatus = "STALE";
              statusMessage = "Air quality observations are stale (>24 hours old).";
            } else {
              aqiStatus = "AVAILABLE";
              statusMessage = `Independently calculated CPCB-methodology AQI: ${stationResult.overallAqi} (${stationResult.category}). Prominent: ${stationResult.prominentPollutant}`;
            }
          } else {
            partialSubIndices = stationResult.subIndices;
          }
        } else if (eligibleObsByPollutant.size >= 3 && eligibleHasParticulate) {
          statusMessage = isCpcb
            ? "Overall CPCB AQI unavailable: upstream data.gov.in snapshot omits physical units (µg/m³ / mg/m³) and 16-hour historical time series required for CPCB sub-index verification."
            : "Overall CPCB AQI unavailable: raw Type C pollutant values retrieved, but verified physical units (µg/m³ / mg/m³) or statutory 16-hour hourly sufficiency are not satisfied.";
        }
      } catch (err: unknown) {
        warnings.push(`CPCB calculation engine error: ${String(err)}`);
      }
    }

    const firstObs = observations[0];
    const station: NormalizedStation | null = stationHint || (firstObs ? {
      id: stationId,
      providerId,
      name: firstObs.stationName,
      city: typeof firstObs.rawRecord?.city === "string" ? firstObs.rawRecord.city : "Unknown",
      state: typeof firstObs.rawRecord?.state === "string" ? firstObs.rawRecord.state : "Unknown",
      latitude: typeof firstObs.rawRecord?.latitude === "number" ? firstObs.rawRecord.latitude : 0,
      longitude: typeof firstObs.rawRecord?.longitude === "number" ? firstObs.rawRecord.longitude : 0,
      availablePollutants: Array.from(pollutantGroups.keys()),
      lastReportedAt: firstObs.observationTime,
      license: isCpcb ? "GODL-India" : "OpenAQ",
      attribution: isCpcb ? "CPCB / data.gov.in" : "OpenAQ"
    } : null);

    return {
      station,
      observations,
      calculatedAqi,
      ...(partialSubIndices ? { partialSubIndices } : {}),
      aqiStatus,
      statusMessage,
      provider: providerId,
      retrievedAt: data.retrievedAt,
      warnings
    };
  }

  public async getForecast(params: {
    latitude: number;
    longitude: number;
    horizonDays?: number;
  }): Promise<{
    forecast: readonly NormalizedForecast[];
    modelDomain: string;
    spatialResolutionKm: number;
    temporalResolutionHours: number;
    retrievedAt: string;
    warnings: readonly string[];
  }> {
    const cacheKey = this.cacheService.buildKey(
      "cams_forecast",
      `${params.latitude.toFixed(2)}_${params.longitude.toFixed(2)}_${params.horizonDays ?? 3}`
    );

    const { data } = await this.cacheService.getOrSet(cacheKey, 1800, async () => {
      const breaker = this.circuitBreakers.get("OPEN_METEO_CAMS")!;
      if (!breaker.canExecute()) {
        return {
          forecast: [],
          modelDomain: "CAMS_GLOBAL",
          spatialResolutionKm: 45,
          temporalResolutionHours: 1,
          retrievedAt: new Date().toISOString(),
          warnings: ["Circuit breaker open for OPEN_METEO_CAMS (service temporarily degraded)"]
        };
      }

      try {
        const res = await this.openMeteoProvider.getForecast({
          latitude: params.latitude,
          longitude: params.longitude,
          horizonDays: params.horizonDays
        });
        breaker.recordSuccess();
        return {
          forecast: res.forecast,
          modelDomain: res.modelDomain,
          spatialResolutionKm: res.spatialResolutionKm,
          temporalResolutionHours: res.temporalResolutionHours,
          retrievedAt: res.retrievedAt,
          warnings: res.warnings
        };
      } catch (err: unknown) {
        breaker.recordFailure();
        return {
          forecast: [],
          modelDomain: "CAMS_GLOBAL",
          spatialResolutionKm: 45,
          temporalResolutionHours: 1,
          retrievedAt: new Date().toISOString(),
          warnings: [`Open-Meteo CAMS forecast fetch failed: ${String(err)}`]
        };
      }
    });

    return data;
  }
}

export const globalSourceOrchestrator = new SourceOrchestrator();
