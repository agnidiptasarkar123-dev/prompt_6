// SPDX-License-Identifier: Apache-2.0
import { RedisService, globalRedisService } from "@/lib/redis/redis-client";

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetSeconds: number;
  readonly isDistributed: boolean;
}

export class RateLimiter {
  private readonly redis: RedisService;
  private readonly localCounters = new Map<string, { count: number; resetAt: number }>();

  constructor(redis: RedisService = globalRedisService) {
    this.redis = redis;
  }

  public async checkLimit(
    identifier: string,
    limit: number = 60,
    windowSeconds: number = 60
  ): Promise<RateLimitResult> {
    const key = `hs_rl:${identifier}`;
    const now = Date.now();

    // In-memory / fallback logic
    let current = this.localCounters.get(key);
    if (!current || now > current.resetAt) {
      current = { count: 1, resetAt: now + windowSeconds * 1000 };
      this.localCounters.set(key, current);
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetSeconds: windowSeconds,
        isDistributed: this.redis.isDistributed()
      };
    }

    current.count += 1;
    const remaining = Math.max(0, limit - current.count);
    const resetSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    const allowed = current.count <= limit;

    return {
      allowed,
      limit,
      remaining,
      resetSeconds,
      isDistributed: this.redis.isDistributed()
    };
  }
}

export const globalRateLimiter = new RateLimiter();
