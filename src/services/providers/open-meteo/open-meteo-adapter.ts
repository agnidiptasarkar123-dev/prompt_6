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
import { OpenMeteoClient, type OpenMeteoClientOptions } from "./open-meteo-client";
import type {
  NormalizedForecast,
  PollutantType
} from "@/schemas/providers/normalized-provider.schema";

const OPEN_METEO_LICENSE = "Creative Commons Attribution 4.0 International (CC BY 4.0)";
const OPEN_METEO_ATTRIBUTION =
  "Open-Meteo Air Quality API / Copernicus Atmosphere Monitoring Service (CAMS Global) under CC BY 4.0";

export class OpenMeteoAdapter implements AirQualityProvider {
  public readonly providerId = "OPEN_METEO_CAMS";
  private readonly client: OpenMeteoClient;

  constructor(options: OpenMeteoClientOptions = {}) {
    this.client = new OpenMeteoClient(options);
  }

  public async getCapabilities(): Promise<ProviderCapabilities> {
    return {
      providerId: this.providerId,
      displayName: "Open-Meteo CAMS Global Forecast",
      providesGroundObservations: false,
      providesAtmosphericForecast: true,
      providesStationSearch: false,
      rateLimitPerMinute: 600,
      defaultCacheTtlSeconds: 3600, // 1 hour model update cycle
      legalLicense: OPEN_METEO_LICENSE,
      mandatoryAttribution: OPEN_METEO_ATTRIBUTION
    };
  }

  public async searchStations(_query: StationSearchQuery): Promise<ProviderStationResult> {
    return {
      providerId: this.providerId,
      stations: [],
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: ["Open-Meteo CAMS is an atmospheric forecast model, not a ground station network."]
    };
  }

  public async getObservations(_query: ObservationQuery): Promise<ProviderObservationResult> {
    return {
      providerId: this.providerId,
      observations: [],
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: ["Open-Meteo CAMS does not provide real-time ground monitoring observations."]
    };
  }

  public async getForecast(query: ForecastQuery): Promise<ProviderForecastResult> {
    const retrievedAt = new Date().toISOString();
    try {
      const resp = await this.client.getCamsForecast({
        latitude: query.latitude,
        longitude: query.longitude,
        horizonDays: query.horizonDays ?? 3
      });

      const forecastList: NormalizedForecast[] = [];
      const times = resp.hourly.time;
      const count = times.length;

      const variables: Array<{ key: keyof typeof resp.hourly; pollutant: PollutantType; unit: string }> = [
        { key: "pm2_5", pollutant: "PM2.5", unit: "µg/m³" },
        { key: "pm10", pollutant: "PM10", unit: "µg/m³" },
        { key: "nitrogen_dioxide", pollutant: "NO2", unit: "µg/m³" },
        { key: "sulphur_dioxide", pollutant: "SO2", unit: "µg/m³" },
        { key: "carbon_monoxide", pollutant: "CO", unit: "mg/m³" },
        { key: "ozone", pollutant: "O3", unit: "µg/m³" }
      ];

      for (let i = 0; i < count; i++) {
        const timeStr = times[i];
        if (!timeStr) continue;

        // Ensure proper UTC timestamp (e.g. append Z if not present)
        const validTime = timeStr.endsWith("Z") ? timeStr : `${timeStr}:00Z`;

        for (const v of variables) {
          const valuesArray = resp.hourly[v.key] as (number | null)[] | undefined;
          if (valuesArray && i < valuesArray.length) {
            const rawVal = valuesArray[i];
            if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal) && rawVal >= 0) {
              // Open-Meteo returns CO in µg/m³. Convert to mg/m³ for Indian CPCB compatibility
              const forecastVal = v.pollutant === "CO" ? Math.round((rawVal / 1000) * 100) / 100 : rawVal;

              forecastList.push({
                id: `cams_${query.latitude.toFixed(2)}_${query.longitude.toFixed(2)}_${v.pollutant}_${validTime}`,
                latitude: resp.latitude,
                longitude: resp.longitude,
                modelDomain: "cams_global",
                spatialResolutionKm: 45,
                temporalResolutionHours: 3,
                pollutant: v.pollutant,
                forecastValue: forecastVal,
                unit: v.unit,
                validTime,
                issueTime: null,
                retrievalTime: retrievedAt,
                typology: "TYPE_D_MODEL_FORECAST",
                license: OPEN_METEO_LICENSE,
                attribution: OPEN_METEO_ATTRIBUTION
              });
            }
          }
        }
      }

      return {
        providerId: this.providerId,
        forecast: forecastList,
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 3,
        retrievedAt,
        status: "CONFIGURED",
        warnings: []
      };
    } catch (err: unknown) {
      return {
        providerId: this.providerId,
        forecast: [],
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 3,
        retrievedAt,
        status: "UNAVAILABLE",
        warnings: [err instanceof Error ? err.message : String(err)]
      };
    }
  }
}
