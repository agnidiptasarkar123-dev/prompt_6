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
    const isProduction = process.env.NODE_ENV === "production";

    // 1. Production / distributed execution via Redis backend
    if (this.redis.isDistributed()) {
      const res = await this.redis.incrementRateLimit(key, windowSeconds);
      if (res !== null) {
        const allowed = res.count <= limit;
        const remaining = Math.max(0, limit - res.count);
        return {
          allowed,
          limit,
          remaining,
          resetSeconds: res.resetSeconds,
          isDistributed: true
        };
      }

      // Redis failed during execution
      if (isProduction) {
        // In production: DO NOT silently fall back to per-instance memory.
        // Fail-safe abuse protection policy: reject request safely and alert.
        console.error(`[CRITICAL] Redis rate limit backend failure in production for key: ${key}`);
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetSeconds: windowSeconds,
          isDistributed: false
        };
      }
    }

    // 2. Unconfigured Redis in production
    if (isProduction) {
      console.error("[CRITICAL] Production rate limiting requires a distributed Redis backend (UPSTASH_REDIS_REST_URL/TOKEN).");
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds: windowSeconds,
        isDistributed: false
      };
    }

    // 3. Development / Test environment: in-memory sliding window counters permitted
    const now = Date.now();
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
