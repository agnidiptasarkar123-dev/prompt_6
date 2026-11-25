// SPDX-License-Identifier: Apache-2.0
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";

export type ProviderStatus = "CONFIGURED" | "NOT_CONFIGURED" | "DEGRADED" | "UNAVAILABLE";

export const PROVIDER_STATUSES: readonly ProviderStatus[] = [
  "CONFIGURED",
  "NOT_CONFIGURED",
  "DEGRADED",
  "UNAVAILABLE"
] as const;

export interface ProviderCapabilities {
  readonly providerId: string;
  readonly displayName: string;
  readonly providesGroundObservations: boolean;
  readonly providesAtmosphericForecast: boolean;
  readonly providesStationSearch: boolean;
  readonly rateLimitPerMinute: number;
  readonly defaultCacheTtlSeconds: number;
  readonly legalLicense: string;
  readonly mandatoryAttribution: string;
}

export interface StationSearchQuery {
  readonly query?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly radiusKm?: number;
  readonly limit?: number;
}

export interface ObservationQuery {
  readonly stationId?: string;
  readonly stationName?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly radiusKm?: number;
  readonly maxAgeHours?: number;
}

export interface ForecastQuery {
  readonly latitude: number;
  readonly longitude: number;
  readonly horizonDays?: number;
}

export interface ProviderStationResult {
  readonly providerId: string;
  readonly stations: readonly NormalizedStation[];
  readonly retrievedAt: string; // ISO-8601 UTC
  readonly status: ProviderStatus;
  readonly warnings: readonly string[];
}

export interface ProviderObservationResult {
  readonly providerId: string;
  readonly observations: readonly NormalizedObservation[];
  readonly retrievedAt: string; // ISO-8601 UTC
  readonly status: ProviderStatus;
  readonly warnings: readonly string[];
}

export interface ProviderForecastResult {
  readonly providerId: string;
  readonly forecast: readonly NormalizedForecast[];
  readonly modelDomain: string;
  readonly spatialResolutionKm: number;
  readonly temporalResolutionHours: number;
  readonly retrievedAt: string; // ISO-8601 UTC
  readonly status: ProviderStatus;
  readonly warnings: readonly string[];
}

export interface AirQualityProvider {
  readonly providerId: string;
  getCapabilities(): Promise<ProviderCapabilities>;
  searchStations(query: StationSearchQuery): Promise<ProviderStationResult>;
  getObservations(query: ObservationQuery): Promise<ProviderObservationResult>;
  getForecast(query: ForecastQuery): Promise<ProviderForecastResult>;
}
