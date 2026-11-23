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
        warnings.push("CPCB circuit breaker is OPEN (service temporarily degraded)");
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
        warnings.push("OpenAQ circuit breaker is OPEN (service temporarily degraded)");
      }

      // Sort stations strictly by distance
      allStations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

      return { stations: allStations, warnings };
    });

    return data;
  }

  public async getStationAirQuality(
    stationId: string,
    stationHint?: NormalizedStation
  ): Promise<StationAirQualityResult> {
    const isCpcb = stationId.startsWith("cpcb_");
    const provider = isCpcb ? this.cpcbProvider : this.openaqProvider;
    const providerId = isCpcb ? "CPCB_CAAQMS" : "OPENAQ";
    const cacheKey = this.cacheService.buildKey("aq_obs", stationId);

    const { data } = await this.cacheService.getOrSet(cacheKey, 300, async () => {
      const res = await provider.getObservations({ stationId });
      return {
        observations: res.observations,
        warnings: res.warnings,
        retrievedAt: res.retrievedAt
      };
    });

    const observations = data.observations;
    const warnings = [...data.warnings];

    // Evaluate Phase 1 CPCB Engine
    let calculatedAqi: CpcbAqiResult | null = null;
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

    const hasParticulate = pollutantGroups.has("PM2.5") || pollutantGroups.has("PM10");
    const distinctPollutantsCount = pollutantGroups.size;

    // Check if observations meet the CPCB 3-pollutant criteria with verified data sufficiency
    if (distinctPollutantsCount >= 3 && hasParticulate) {
      try {
        const validatedMeasurements: ValidatedAggregatedMeasurement[] = [];

        for (const [pol, obsList] of pollutantGroups.entries()) {
          const windowHours = (pol === "CO" || pol === "O3") ? 8 : 24;
          const minRequiredHours = pol === "CO" || pol === "O3" ? 6 : 16;
          const baseObs = obsList[0]!;

          // An observation must have a verified physical unit (µg/m³ or mg/m³)
          if (!baseObs.unit || (baseObs.unit !== "µg/m³" && baseObs.unit !== "mg/m³")) {
            warnings.push(`Skipping sub-index for ${pol}: unverified or missing unit.`);
            continue;
          }

          // Strict sufficiency: a single snapshot observation with averagingPeriod !== "24h" (or "8h")
          // has validHoursInWindow = obsList.length (e.g. 1), which correctly reflects lack of 16h/6h data sufficiency.
          const isVerifiedStatutory = baseObs.averagingPeriod === "24h" || (windowHours === 8 && baseObs.averagingPeriod === "8h");
          const validHoursInWindow = isVerifiedStatutory ? minRequiredHours : obsList.length;

          const measurement = createValidatedAggregatedMeasurement({
            stationId,
            pollutant: pol,
            concentration: baseObs.value,
            unit: baseObs.unit,
            averagingWindowHours: windowHours,
            recordedAtUtc: baseObs.observationTime,
            validHoursInWindow
          });

          validatedMeasurements.push(measurement);
        }

        if (validatedMeasurements.length >= 3) {
          const stationResult = calculateStationCpcbAqi(stationId, validatedMeasurements, data.retrievedAt);
          if (stationResult.overallAqi !== null) {
            calculatedAqi = stationResult;
            aqiStatus = "AVAILABLE";
            statusMessage = `Independently calculated CPCB-methodology AQI: ${stationResult.overallAqi} (${stationResult.category}). Prominent: ${stationResult.prominentPollutant}`;
          } else {
            statusMessage = stationResult.explanation;
          }
        }
      } catch (err: unknown) {
        warnings.push(`CPCB calculation engine error: ${String(err)}`);
      }
    }

    return {
      station: stationHint || null,
      observations,
      calculatedAqi,
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

    const { data } = await this.cacheService.getOrSet(cacheKey, 3600, async () => {
      const res = await this.openMeteoProvider.getForecast({
        latitude: params.latitude,
        longitude: params.longitude,
        horizonDays: params.horizonDays
      });
      return {
        forecast: res.forecast,
        modelDomain: res.modelDomain,
        spatialResolutionKm: res.spatialResolutionKm,
        temporalResolutionHours: res.temporalResolutionHours,
        retrievedAt: res.retrievedAt,
        warnings: res.warnings
      };
    });

    return data;
  }
}

export const globalSourceOrchestrator = new SourceOrchestrator();
