// SPDX-License-Identifier: Apache-2.0
import { fetchJsonWithTimeout } from "@/lib/http/upstream-fetch";
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
  private readonly allowedHosts: readonly string[] | undefined;

  constructor(options: OpenMeteoClientOptions = {}) {
    this.baseUrl = options.baseUrl || "https://air-quality-api.open-meteo.com/v1/air-quality";
    this.timeoutMs = options.timeoutMs || 8000;
    this.allowedHosts = options.baseUrl ? undefined : ["air-quality-api.open-meteo.com"];
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

    return fetchJsonWithTimeout({
      url: url.toString(),
      allowedHosts: this.allowedHosts,
      timeoutMs: this.timeoutMs,
      errorPrefix: "Open-Meteo",
      parse: (json) => OpenMeteoApiResponseSchema.parse(json)
    });
  }
}
