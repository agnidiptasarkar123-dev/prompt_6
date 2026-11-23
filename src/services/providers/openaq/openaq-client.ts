// SPDX-License-Identifier: Apache-2.0
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

  constructor(options: OpenAQClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.openaq.org/v3";
    this.timeoutMs = options.timeoutMs || 8000;
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
    url.searchParams.set("iso", params.iso ?? "IN");
    url.searchParams.set("limit", String(params.limit ?? 100));
    if (params.page) {
      url.searchParams.set("page", String(params.page));
    }
    if (params.coordinates) {
      url.searchParams.set(
        "coordinates",
        `${params.coordinates.latitude},${params.coordinates.longitude}`
      );
      url.searchParams.set("radius", String((params.radiusKm ?? 50) * 1000));
    }

    return this.fetchWithAuth(url.toString(), OpenAQLocationsResponseSchema);
  }

  public async getSensorMeasurements(
    sensorId: number,
    limit: number = 24
  ): Promise<OpenAQMeasurementsResponse> {
    if (!this.isConfigured()) {
      throw new Error("OpenAQ provider is NOT_CONFIGURED (OPENAQ_API_KEY is missing)");
    }

    const url = new URL(`${this.baseUrl}/sensors/${sensorId}/measurements`);
    url.searchParams.set("limit", String(limit));

    return this.fetchWithAuth(url.toString(), OpenAQMeasurementsResponseSchema);
  }

  private async fetchWithAuth<T>(url: string, schema: { parse: (json: unknown) => T }): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": this.apiKey!
        },
        signal: controller.signal
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        throw new Error(`OpenAQ rate limit exceeded (HTTP 429). Retry after ${retryAfter}s`);
      }

      if (!response.ok) {
        throw new Error(`OpenAQ upstream error: HTTP ${response.status} from ${url}`);
      }

      const json = await response.json();
      return schema.parse(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`OpenAQ upstream request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
