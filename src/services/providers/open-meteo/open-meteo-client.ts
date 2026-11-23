// SPDX-License-Identifier: Apache-2.0
import {
  OpenMeteoApiResponseSchema,
  type OpenMeteoApiResponse
} from "@/schemas/providers/open-meteo-upstream.schema";

export interface OpenMeteoClientOptions {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

export class OpenMeteoClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: OpenMeteoClientOptions = {}) {
    this.baseUrl = options.baseUrl || "https://air-quality-api.open-meteo.com/v1/air-quality";
    this.timeoutMs = options.timeoutMs || 8000;
  }

  public async getCamsForecast(params: {
    latitude: number;
    longitude: number;
    horizonDays?: number;
  }): Promise<OpenMeteoApiResponse> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("latitude", String(params.latitude));
    url.searchParams.set("longitude", String(params.longitude));
    url.searchParams.set("domains", "cams_global");
    url.searchParams.set(
      "hourly",
      "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone"
    );
    url.searchParams.set("timezone", "UTC");
    if (params.horizonDays) {
      url.searchParams.set("forecast_days", String(Math.min(params.horizonDays, 5)));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo upstream error: HTTP ${response.status} from ${url.toString()}`);
      }

      const json = await response.json();
      return OpenMeteoApiResponseSchema.parse(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Open-Meteo upstream request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
