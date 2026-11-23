// SPDX-License-Identifier: Apache-2.0
import { RedisService, globalRedisService } from "@/lib/redis/redis-client";

export class CacheService {
  private readonly redis: RedisService;
  private readonly inFlightRequests = new Map<string, Promise<unknown>>();
  public readonly version = "v1";

  constructor(redis: RedisService = globalRedisService) {
    this.redis = redis;
  }

  public buildKey(prefix: string, identifier: string): string {
    return `hs_${this.version}:${prefix}:${identifier}`;
  }

  /**
   * Request-coalesced cache wrapper:
   * 1. Check Redis / memory cache.
   * 2. If missed and another request is already fetching the exact same key, await that promise.
   * 3. Otherwise fetch, store, and return.
   */
  public async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<{ data: T; cached: boolean; isDistributed: boolean }> {
    const cached = await this.redis.get<T>(key);
    if (cached !== null) {
      return { data: cached, cached: true, isDistributed: this.redis.isDistributed() };
    }

    // Coalesce concurrent requests for the same key
    const inFlight = this.inFlightRequests.get(key) as Promise<T> | undefined;
    if (inFlight) {
      const data = await inFlight;
      return { data, cached: true, isDistributed: this.redis.isDistributed() };
    }

    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        await this.redis.set(key, result, ttlSeconds);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, fetchPromise);
    const data = await fetchPromise;
    return { data, cached: false, isDistributed: this.redis.isDistributed() };
  }
}

export const globalCacheService = new CacheService();
