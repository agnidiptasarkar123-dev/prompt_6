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
import { OpenAQClient, type OpenAQClientOptions } from "./openaq-client";
import type { OpenAQLocation } from "@/schemas/providers/openaq-upstream.schema";
import type {
  NormalizedStation,
  NormalizedObservation,
  PollutantType
} from "@/schemas/providers/normalized-provider.schema";
import { CpcbAdapter } from "../cpcb/cpcb-adapter";

export class OpenAQAdapter implements AirQualityProvider {
  public readonly providerId = "OPENAQ";
  private readonly client: OpenAQClient;

  constructor(options: OpenAQClientOptions = {}) {
    this.client = new OpenAQClient(options);
  }

  public async getCapabilities(): Promise<ProviderCapabilities> {
    return {
      providerId: this.providerId,
      displayName: "OpenAQ v3 Global Sensor Platform",
      providesGroundObservations: true,
      providesAtmosphericForecast: false,
      providesStationSearch: true,
      rateLimitPerMinute: 60,
      defaultCacheTtlSeconds: 600, // 10 minutes
      legalLicense: "OpenAQ Aggregated Data / Source Specific License",
      mandatoryAttribution: "OpenAQ and original data contributors"
    };
  }

  public static mapParameterToPollutant(paramName: string): PollutantType | null {
    const p = paramName.toLowerCase().replace(/[\s\.\-_]/g, "");
    switch (p) {
      case "pm25":
        return "PM2.5";
      case "pm10":
        return "PM10";
      case "no2":
        return "NO2";
      case "so2":
        return "SO2";
      case "co":
        return "CO";
      case "o3":
      case "ozone":
        return "O3";
      case "nh3":
        return "NH3";
      case "pb":
      case "lead":
        return "Pb";
      default:
        return null;
    }
  }

  public static normalizeLocationToStation(loc: OpenAQLocation): NormalizedStation {
    const pollutants: PollutantType[] = [];
    if (loc.sensors) {
      for (const s of loc.sensors) {
        const mapped = OpenAQAdapter.mapParameterToPollutant(s.parameter.name);
        if (mapped && !pollutants.includes(mapped)) {
          pollutants.push(mapped);
        }
      }
    }

    const licenseName =
      loc.licenses && loc.licenses.length > 0 && loc.licenses[0]?.name
        ? loc.licenses[0].name
        : "Source Provider Specific License via OpenAQ";
    const providerName = loc.provider?.name || loc.owner?.name || "OpenAQ Community Contributor";
    let resolvedCity = loc.locality ? loc.locality.trim() : "";
    if (!resolvedCity && loc.name) {
      const commaParts = loc.name
        .split(",")
        .map((part) => part.replace(/\s*-\s*[A-Z]{2,10}$/i, "").trim())
        .filter((part) => part.length >= 2);
      if (commaParts.length >= 2) {
        resolvedCity = commaParts[commaParts.length - 1]!;
      }
    }

    return {
      id: `openaq_${loc.id}`,
      providerId: "OPENAQ",
      name: loc.name,
      city: resolvedCity || "Unknown Locality",
      state: loc.country?.name || "India",
      latitude: loc.coordinates.latitude,
      longitude: loc.coordinates.longitude,
      availablePollutants: pollutants,
      lastReportedAt: loc.datetimeLast?.utc || null,
      license: licenseName,
      attribution: `OpenAQ / ${providerName}`
    };
  }

  public async searchStations(query: StationSearchQuery): Promise<ProviderStationResult> {
    const retrievedAt = new Date().toISOString();
    if (!this.client.isConfigured()) {
      return {
        providerId: this.providerId,
        stations: [],
        retrievedAt,
        status: "NOT_CONFIGURED",
        warnings: ["OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY missing)"]
      };
    }

    try {
      const response = await this.client.getLocations({
        limit: query.limit ?? 100,
        coordinates:
          query.latitude !== undefined && query.longitude !== undefined
            ? { latitude: query.latitude, longitude: query.longitude }
            : undefined,
        radiusKm: query.radiusKm ?? 50
      });

      let stations = response.results.map(OpenAQAdapter.normalizeLocationToStation);

      if (query.query) {
        const q = query.query.toLowerCase();
        stations = stations.filter(
          (s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
        );
      }

      if (query.latitude !== undefined && query.longitude !== undefined) {
        stations = stations
          .map((s) => ({
            ...s,
            distanceKm: CpcbAdapter.computeHaversineDistanceKm(
              query.latitude!,
              query.longitude!,
              s.latitude,
              s.longitude
            )
          }))
          .sort((a, b) => a.distanceKm! - b.distanceKm!);
      }

      return {
        providerId: this.providerId,
        stations,
        retrievedAt,
        status: "CONFIGURED",
        warnings: []
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
        warnings: ["OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY missing)"]
      };
    }

    if (!query.stationId) {
      return {
        providerId: this.providerId,
        observations: [],
        retrievedAt,
        status: "CONFIGURED",
        warnings: ["Observation query requires a stationId"]
      };
    }

    const rawLocId = query.stationId.replace(/^openaq_/, "");
    const locIdNum = parseInt(rawLocId, 10);
    if (isNaN(locIdNum)) {
      return {
        providerId: this.providerId,
        observations: [],
        retrievedAt,
        status: "UNAVAILABLE",
        warnings: [`Invalid OpenAQ stationId '${query.stationId}'`]
      };
    }

    try {
      const locResponse = await this.client.getLocation(locIdNum);
      const matched = locResponse.results.find((l) => l.id === locIdNum) || locResponse.results[0];
      if (!matched || !matched.sensors || matched.sensors.length === 0) {
        return {
          providerId: this.providerId,
          observations: [],
          retrievedAt,
          status: "CONFIGURED",
          warnings: [`No sensors found for location ${locIdNum}`]
        };
      }

      const observations: NormalizedObservation[] = [];
      const warnings: string[] = [];
      const measLimit = query.maxAgeHours ? Math.min(query.maxAgeHours, 100) : 24;
      const windowHours = query.maxAgeHours ?? 26;
      const datetimeFrom = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

      const cpcbSensors = matched.sensors
        .map((sensor) => ({
          sensor,
          pollutant: OpenAQAdapter.mapParameterToPollutant(sensor.parameter.name)
        }))
        .filter((item): item is { sensor: typeof matched.sensors[number]; pollutant: PollutantType } => item.pollutant !== null);

      await Promise.all(
        cpcbSensors.map(async ({ sensor, pollutant }) => {
          try {
            const hasCustomMeasOverride = Object.prototype.hasOwnProperty.call(
              this.client,
              "getSensorMeasurements"
            );
            const hasCustomHoursOverride = Object.prototype.hasOwnProperty.call(
              this.client,
              "getSensorHours"
            );
            const useHoursPrimary =
              query.maxAgeHours === undefined &&
              typeof (this.client as { getSensorHours?: unknown }).getSensorHours === "function" &&
              (!hasCustomMeasOverride || hasCustomHoursOverride);

            let measResponse = { results: [] as Awaited<ReturnType<OpenAQClient["getSensorMeasurements"]>>["results"] };
            if (useHoursPrimary) {
              try {
                measResponse = await this.client.getSensorHours(sensor.id, 48, datetimeFrom);
              } catch {
                measResponse = { results: [] };
              }
            }
            if (measResponse.results.length === 0) {
              measResponse = await this.client.getSensorMeasurements(sensor.id, measLimit, datetimeFrom);
            }

            const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
            const retMs = new Date(retrievedAt).getTime();

            for (const m of measResponse.results) {
              const rawObsTime = m.period?.datetimeTo?.utc || m.period?.datetimeFrom?.utc || null;
              const obsTime = rawObsTime ?? retrievedAt;
              if (m.value >= 0) {
                const obsDate = new Date(obsTime).getTime();
                const isFutureSkewed = !rawObsTime || isNaN(obsDate) || obsDate - retMs > MAX_CLOCK_SKEW_MS;
                const isStale = !isFutureSkewed && retMs - obsDate > 24 * 3600 * 1000;
                const rawUnit = sensor.parameter.units?.trim() || null;
                const unitInfo = CpcbAdapter.normalizePollutantUnit(rawUnit, pollutant);
                let val = m.value;
                if (unitInfo.convertedValueMultiplier !== 1.0) {
                  val = Math.round(val * unitInfo.convertedValueMultiplier * 100) / 100;
                }

                observations.push({
                  id: `openaq_${locIdNum}_${sensor.id}_${obsTime}`,
                  stationId: `openaq_${locIdNum}`,
                  stationName: matched.name,
                  providerId: this.providerId,
                  pollutant,
                  value: val,
                  unit: unitInfo.verifiedUnit,
                  rawUnit,
                  rawValue: m.value,
                  rawRecord: m as unknown as Record<string, unknown>,
                  averagingPeriod: "1h",
                  typology: "TYPE_C_RAW_MEASUREMENT",
                  observationTime: obsTime,
                  sourceUpdateTime: rawObsTime,
                  retrievalTime: retrievedAt,
                  qualityFlag:
                    isFutureSkewed || val > 2500
                      ? "SUSPICIOUS"
                      : isStale
                        ? "STALE"
                        : !unitInfo.isVerified
                          ? "PROVISIONAL"
                          : "VERIFIED",
                  license: matched.licenses?.[0]?.name || "OpenAQ Contributor License",
                  attribution: `OpenAQ / ${matched.provider?.name || "Community"}`
                });
              }
            }
          } catch (err: unknown) {
            warnings.push(`Failed to fetch measurements for sensor ${sensor.id}: ${String(err)}`);
          }
        })
      );

      return {
        providerId: this.providerId,
        observations,
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
      warnings: ["OpenAQ does not provide atmospheric forecast models."]
    };
  }
}
