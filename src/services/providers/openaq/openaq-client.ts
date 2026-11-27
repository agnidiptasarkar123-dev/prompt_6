// SPDX-License-Identifier: Apache-2.0
import { fetchJsonWithTimeout } from "@/lib/http/upstream-fetch";
import {
  OpenAQLocationsResponseSchema,
  OpenAQMeasurementsResponseSchema,
  type OpenAQLocationsResponse,
  type OpenAQMeasurementsResponse
} from "@/schemas/providers/openaq-upstream.schema";

export interface OpenAQClientOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

export class OpenAQClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly allowedHosts: readonly string[] | undefined;

  constructor(options: OpenAQClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.openaq.org/v3";
    this.timeoutMs = options.timeoutMs || 15000;
    this.allowedHosts = options.baseUrl ? undefined : ["api.openaq.org"];
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async getLocations(params: {
    iso?: string;
    coordinates?: { latitude: number; longitude: number };
    radiusKm?: number;
    limit?: number;
    page?: number;
  } = {}): Promise<OpenAQLocationsResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY is missing)");
    }

    const url = new URL(`${this.baseUrl}/locations`);
    if (params.iso || !params.coordinates) {
      url.searchParams.set("iso", params.iso ?? "IN");
    }
    url.searchParams.set("limit", String(params.limit ?? 100));
    if (params.page) {
      url.searchParams.set("page", String(params.page));
    }
    if (params.coordinates) {
      url.searchParams.set(
        "coordinates",
        `${params.coordinates.latitude},${params.coordinates.longitude}`
      );
      // OpenAQ v3 caps location radius search at 25,000 meters
      url.searchParams.set("radius", String(Math.min((params.radiusKm ?? 25) * 1000, 25000)));
    }

    return this.fetchWithAuth(url.toString(), OpenAQLocationsResponseSchema);
  }

  public async getLocation(locationId: number): Promise<OpenAQLocationsResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY is missing)");
    }
    const url = new URL(`${this.baseUrl}/locations/${locationId}`);
    return this.fetchWithAuth(url.toString(), OpenAQLocationsResponseSchema);
  }

  public async getSensorHours(
    sensorId: number,
    limit: number = 48,
    datetimeFrom?: string
  ): Promise<OpenAQMeasurementsResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY is missing)");
    }

    const url = new URL(`${this.baseUrl}/sensors/${sensorId}/hours`);
    url.searchParams.set("limit", String(limit));
    if (datetimeFrom) {
      url.searchParams.set("datetime_from", datetimeFrom);
    }

    return this.fetchWithAuth(url.toString(), OpenAQMeasurementsResponseSchema);
  }

  public async getSensorMeasurements(
    sensorId: number,
    limit: number = 24,
    datetimeFrom?: string
  ): Promise<OpenAQMeasurementsResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY is missing)");
    }

    const url = new URL(`${this.baseUrl}/sensors/${sensorId}/measurements`);
    url.searchParams.set("limit", String(limit));
    if (datetimeFrom) {
      url.searchParams.set("datetime_from", datetimeFrom);
    }

    return this.fetchWithAuth(url.toString(), OpenAQMeasurementsResponseSchema);
  }

  private async fetchWithAuth<T>(url: string, schema: { parse: (json: unknown) => T }): Promise<T> {
    return fetchJsonWithTimeout({
      url,
      headers: { "X-API-Key": this.apiKey! },
      allowedHosts: this.allowedHosts,
      timeoutMs: this.timeoutMs,
      errorPrefix: "OpenAQ",
      mapHttpError: (response) => {
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After") || "60";
          return new Error(`OpenAQ rate limit exceeded (HTTP 429). Retry after ${retryAfter}s`);
        }
        return null;
      },
      parse: (json) => schema.parse(json)
    });
  }
}
