// SPDX-License-Identifier: Apache-2.0
import { fetchJsonWithTimeout } from "@/lib/http/upstream-fetch";
import { CpcbApiResponseSchema, type CpcbApiResponse } from "@/schemas/providers/cpcb-upstream.schema";

export interface CpcbClientOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

export class CpcbClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly allowedHosts: readonly string[] | undefined;

  constructor(options: CpcbClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
    this.timeoutMs = options.timeoutMs || 15000;
    this.allowedHosts = options.baseUrl ? undefined : ["api.data.gov.in"];
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Redacts sensitive api-key from any URL for safe logging/error reporting
   */
  public static redactUrl(url: string): string {
    return url.replace(/([?&]api-key=)[^&]+/gi, "$1[REDACTED]");
  }

  public async fetchRawData(params: {
    limit?: number;
    offset?: number;
    filters?: Record<string, string>;
  } = {}): Promise<CpcbApiResponse> {
    if (!this.isConfigured()) {
      throw new Error("CPCB provider is NOT_CONFIGURED (DATA_GOV_IN_API_KEY is missing)");
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set("api-key", this.apiKey!);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(params.limit ?? 1000));
    url.searchParams.set("offset", String(params.offset ?? 0));

    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        url.searchParams.set(`filters[${key}]`, value);
      }
    }

    const fullUrl = url.toString();
    return fetchJsonWithTimeout({
      url: fullUrl,
      displayUrl: CpcbClient.redactUrl(fullUrl),
      allowedHosts: this.allowedHosts,
      timeoutMs: this.timeoutMs,
      errorPrefix: "CPCB",
      parse: (json) => CpcbApiResponseSchema.parse(json)
    });
  }
}
