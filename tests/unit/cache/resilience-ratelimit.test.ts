// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisService } from "@/lib/redis/redis-client";
import { CacheService } from "@/services/cache/cache-service";
import { RateLimiter } from "@/services/rate-limit/rate-limiter";
import { CircuitBreaker } from "@/lib/http/circuit-breaker";

describe("Cache, Rate Limiting & Resilience Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. RedisService (RES-001 to RES-015)
  it("RES-001: reports isDistributed false when UPSTASH credentials missing", () => {
    const redis = new RedisService({});
    expect(redis.isDistributed()).toBe(false);
  });

  it("RES-002: reports isDistributed true when UPSTASH credentials provided", () => {
    const redis = new RedisService({
      url: "https://mock-redis.upstash.io",
      token: "mock-token-123"
    });
    expect(redis.isDistributed()).toBe(true);
  });

  it("RES-003: memory fallback set and get returns stored value", async () => {
    const redis = new RedisService({});
    await redis.set("test_key_1", { name: "HawaSaathi", aqi: 150 }, 60);
    const val = await redis.get<{ name: string; aqi: number }>("test_key_1");
    expect(val).toEqual({ name: "HawaSaathi", aqi: 150 });
  });

  it("RES-004: memory fallback get returns null for non-existent key", async () => {
    const redis = new RedisService({});
    const val = await redis.get("non_existent_key");
    expect(val).toBeNull();
  });

  it("RES-005: memory fallback respects TTL and returns null after expiry", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("expiring_key", "data", 10); // 10 seconds TTL

      const immediate = await redis.get("expiring_key");
      expect(immediate).toBe("data");

      vi.advanceTimersByTime(11000); // 11 seconds later

      const expired = await redis.get("expiring_key");
      expect(expired).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-006: memory fallback overwrites existing key with new value and new TTL", async () => {
    const redis = new RedisService({});
    await redis.set("overwrite_key", "old_value", 60);
    await redis.set("overwrite_key", "new_value", 60);
    const val = await redis.get("overwrite_key");
    expect(val).toBe("new_value");
  });

  it("RES-007: memory fallback del removes existing key", async () => {
    const redis = new RedisService({});
    await redis.set("delete_key", "data", 60);
    await redis.del("delete_key");
    const val = await redis.get("delete_key");
    expect(val).toBeNull();
  });

  it("RES-008: memory fallback stores primitive numbers accurately", async () => {
    const redis = new RedisService({});
    await redis.set("num_key", 42.195, 60);
    const val = await redis.get<number>("num_key");
    expect(val).toBe(42.195);
  });

  it("RES-009: memory fallback stores boolean values accurately", async () => {
    const redis = new RedisService({});
    await redis.set("bool_key", false, 60);
    const val = await redis.get<boolean>("bool_key");
    expect(val).toBe(false);
  });

  it("RES-010: memory fallback stores arrays accurately", async () => {
    const redis = new RedisService({});
    await redis.set("arr_key", [1, 2, "three"], 60);
    const val = await redis.get<unknown[]>("arr_key");
    expect(val).toEqual([1, 2, "three"]);
  });

  it("RES-011: memory fallback clearMemory removes all stored keys", async () => {
    const redis = new RedisService({});
    await redis.set("k1", 1, 60);
    await redis.set("k2", 2, 60);
    await redis.clearMemory();
    expect(await redis.get("k1")).toBeNull();
    expect(await redis.get("k2")).toBeNull();
  });

  it("RES-012: del on non-existent key completes without error", async () => {
    const redis = new RedisService({});
    await expect(redis.del("non_existent")).resolves.toBeUndefined();
  });

  it("RES-013: handles null value gracefully", async () => {
    const redis = new RedisService({});
    await redis.set("null_key", null, 60);
    const val = await redis.get("null_key");
    expect(val).toBeNull();
  });

  it("RES-014: handles undefined options without throwing", () => {
    const redis = new RedisService();
    expect(redis.isDistributed()).toBe(false);
  });

  it("RES-015: memory fallback supports deeply nested JSON objects", async () => {
    const redis = new RedisService({});
    const nested = { a: { b: { c: { d: "deep" } } } };
    await redis.set("deep_key", nested, 60);
    expect(await redis.get("deep_key")).toEqual(nested);
  });

  // 2. CacheService (RES-016 to RES-030)
  it("RES-016: buildKey constructs key with version and prefix (hs_v1:prefix:id)", () => {
    const cache = new CacheService(new RedisService({}));
    const key = cache.buildKey("station", "delhi_anand_vihar");
    expect(key).toBe("hs_v1:station:delhi_anand_vihar");
  });

  it("RES-017: getOrSet executes fetcher and returns data on cache miss", async () => {
    const cache = new CacheService(new RedisService({}));
    const fetcher = vi.fn().mockResolvedValue({ aqi: 180 });

    const result = await cache.getOrSet("key_miss", 60, fetcher);
    expect(result.data).toEqual({ aqi: 180 });
    expect(result.cached).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("RES-018: getOrSet returns cached data without calling fetcher on cache hit", async () => {
    const cache = new CacheService(new RedisService({}));
    const fetcher = vi.fn().mockResolvedValue("fresh_data");

    // First call sets cache
    await cache.getOrSet("key_hit", 60, fetcher);
    // Second call should hit cache
    const secondResult = await cache.getOrSet("key_hit", 60, fetcher);

    expect(secondResult.data).toBe("fresh_data");
    expect(secondResult.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("RES-019: getOrSet coalesces concurrent requests to prevent cache stampede", async () => {
    const cache = new CacheService(new RedisService({}));
    let resolvePromise: (val: string) => void;
    const slowFetch = vi.fn().mockImplementation(() => {
      return new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
    });

    // Fire 3 simultaneous requests for the identical key
    const p1 = cache.getOrSet("stampede_key", 60, slowFetch);
    const p2 = cache.getOrSet("stampede_key", 60, slowFetch);
    const p3 = cache.getOrSet("stampede_key", 60, slowFetch);

    // Give microtasks tick for get() check to resolve and initiate fetch
    await new Promise((r) => setTimeout(r, 10));

    // Resolve slow operation
    resolvePromise!("coalesced_result");

    const [res1, res2, res3] = await Promise.all([p1, p2, p3]);
    expect(res1.data).toBe("coalesced_result");
    expect(res2.data).toBe("coalesced_result");
    expect(res3.data).toBe("coalesced_result");
    expect(slowFetch).toHaveBeenCalledTimes(1);
  });

  it("RES-020: cleans up in-flight promise after fetcher completes", async () => {
    const cache = new CacheService(new RedisService({}));
    const fetcher = vi.fn().mockResolvedValue("first_run");

    await cache.getOrSet("cleanup_key", 60, fetcher);

    // After completion, next request should hit cache
    const res = await cache.getOrSet("cleanup_key", 60, fetcher);
    expect(res.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("RES-021: cleans up in-flight promise when fetcher throws error", async () => {
    const cache = new CacheService(new RedisService({}));
    const badFetcher = vi.fn().mockRejectedValueOnce(new Error("Network glitch"));

    await expect(cache.getOrSet("error_key", 60, badFetcher)).rejects.toThrow("Network glitch");

    // Subsequent request should be able to retry
    const goodFetcher = vi.fn().mockResolvedValue("recovered_data");
    const res = await cache.getOrSet("error_key", 60, goodFetcher);
    expect(res.data).toBe("recovered_data");
    expect(goodFetcher).toHaveBeenCalledTimes(1);
  });

  it("RES-022: propagates isDistributed status in getOrSet result", async () => {
    const localCache = new CacheService(new RedisService({}));
    const resLocal = await localCache.getOrSet("k_local", 60, async () => 1);
    expect(resLocal.isDistributed).toBe(false);

    const mockDistRedis = new RedisService({});
    vi.spyOn(mockDistRedis, "isDistributed").mockReturnValue(true);
    const distCache = new CacheService(mockDistRedis);
    const resDist = await distCache.getOrSet("k_dist", 60, async () => 2);
    expect(resDist.isDistributed).toBe(true);
  });

  it("RES-023: handles empty string identifier in buildKey", () => {
    const cache = new CacheService(new RedisService({}));
    expect(cache.buildKey("test", "")).toBe("hs_v1:test:");
  });

  it("RES-024: handles zero TTL by setting key", async () => {
    const cache = new CacheService(new RedisService({}));
    const res = await cache.getOrSet("zero_ttl", 0, async () => "zero");
    expect(res.data).toBe("zero");
  });

  it("RES-025: handles complex object fetching and serialization in getOrSet", async () => {
    const cache = new CacheService(new RedisService({}));
    const complexObj = {
      station: "Anand Vihar",
      pollutants: [{ name: "PM2.5", value: 120 }]
    };
    const res = await cache.getOrSet("complex_key", 60, async () => complexObj);
    expect(res.data).toEqual(complexObj);
  });

  it("RES-026: distinct keys do not coalesce each other", async () => {
    const cache = new CacheService(new RedisService({}));
    const fetch1 = vi.fn().mockResolvedValue("val1");
    const fetch2 = vi.fn().mockResolvedValue("val2");

    await Promise.all([
      cache.getOrSet("key_a", 60, fetch1),
      cache.getOrSet("key_b", 60, fetch2)
    ]);

    expect(fetch1).toHaveBeenCalledTimes(1);
    expect(fetch2).toHaveBeenCalledTimes(1);
  });

  it("RES-027: cache hit after TTL expiry re-triggers fetcher", async () => {
    vi.useFakeTimers();
    try {
      const cache = new CacheService(new RedisService({}));
      const fetcher = vi.fn().mockImplementation(async () => "val_" + fetcher.mock.calls.length);

      await cache.getOrSet("ttl_retrigger", 5, fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(6000);

      await cache.getOrSet("ttl_retrigger", 5, fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-028: handles async exceptions inside coalesced promises", async () => {
    const cache = new CacheService(new RedisService({}));
    const failFetcher = vi.fn().mockRejectedValue(new Error("Async Crash"));

    const p1 = cache.getOrSet("fail_coalesce", 60, failFetcher);
    const p2 = cache.getOrSet("fail_coalesce", 60, failFetcher);

    await expect(p1).rejects.toThrow("Async Crash");
    await expect(p2).rejects.toThrow("Async Crash");
  });

  it("RES-029: cache version is exposed as v1", () => {
    const cache = new CacheService(new RedisService({}));
    expect(cache.version).toBe("v1");
  });

  it("RES-030: handles multiple concurrent different keys with varying speeds", async () => {
    const cache = new CacheService(new RedisService({}));
    const fast = cache.getOrSet("fast", 60, async () => "fast_result");
    const slow = cache.getOrSet("slow", 60, async () => "slow_result");

    const [f, s] = await Promise.all([fast, slow]);
    expect(f.data).toBe("fast_result");
    expect(s.data).toBe("slow_result");
  });

  // 3. RateLimiter (RES-031 to RES-042)
  it("RES-031: checkLimit allows first request with remaining limit - 1", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    const res = await limiter.checkLimit("user_1", 10, 60);

    expect(res.allowed).toBe(true);
    expect(res.limit).toBe(10);
    expect(res.remaining).toBe(9);
    expect(res.resetSeconds).toBe(60);
  });

  it("RES-032: checkLimit decrements remaining on consecutive calls", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    await limiter.checkLimit("user_2", 5, 60);
    const second = await limiter.checkLimit("user_2", 5, 60);
    expect(second.remaining).toBe(3);
    const third = await limiter.checkLimit("user_2", 5, 60);
    expect(third.remaining).toBe(2);
  });

  it("RES-033: checkLimit allows request exactly at limit boundary with remaining 0", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    for (let i = 0; i < 4; i++) {
      await limiter.checkLimit("user_boundary", 5, 60);
    }
    const fifth = await limiter.checkLimit("user_boundary", 5, 60);
    expect(fifth.allowed).toBe(true);
    expect(fifth.remaining).toBe(0);
  });

  it("RES-034: checkLimit blocks request exceeding limit with allowed false and remaining 0", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    for (let i = 0; i < 5; i++) {
      await limiter.checkLimit("user_exceed", 5, 60);
    }
    const sixth = await limiter.checkLimit("user_exceed", 5, 60);
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("RES-035: checkLimit maintains separate counters for distinct identifiers", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    for (let i = 0; i < 5; i++) {
      await limiter.checkLimit("user_A", 5, 60);
    }
    const userABlocked = await limiter.checkLimit("user_A", 5, 60);
    expect(userABlocked.allowed).toBe(false);

    // User B should still be allowed
    const userB = await limiter.checkLimit("user_B", 5, 60);
    expect(userB.allowed).toBe(true);
    expect(userB.remaining).toBe(4);
  });

  it("RES-036: checkLimit resets counter after windowSeconds expires", async () => {
    vi.useFakeTimers();
    try {
      const limiter = new RateLimiter(new RedisService({}));
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit("user_window", 5, 10);
      }
      expect((await limiter.checkLimit("user_window", 5, 10)).allowed).toBe(false);

      vi.advanceTimersByTime(11000); // 11s later

      const fresh = await limiter.checkLimit("user_window", 5, 10);
      expect(fresh.allowed).toBe(true);
      expect(fresh.remaining).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-037: reports correct decreasing resetSeconds within window", async () => {
    vi.useFakeTimers();
    try {
      const limiter = new RateLimiter(new RedisService({}));
      const first = await limiter.checkLimit("user_time", 10, 60);
      expect(first.resetSeconds).toBe(60);

      vi.advanceTimersByTime(20000); // 20s later

      const second = await limiter.checkLimit("user_time", 10, 60);
      expect(second.resetSeconds).toBeLessThanOrEqual(41);
      expect(second.resetSeconds).toBeGreaterThanOrEqual(39);
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-038: uses default limit 60 and window 60s when omitted", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    const res = await limiter.checkLimit("user_default");
    expect(res.limit).toBe(60);
    expect(res.remaining).toBe(59);
    expect(res.resetSeconds).toBe(60);
  });

  it("RES-039: propagates isDistributed status from redis in RateLimitResult", async () => {
    const localLimiter = new RateLimiter(new RedisService({}));
    const resLocal = await localLimiter.checkLimit("id_1");
    expect(resLocal.isDistributed).toBe(false);

    const distRedis = new RedisService({ url: "https://redis.io", token: "tok" });
    vi.spyOn(distRedis, "incrementRateLimit").mockResolvedValue({
      count: 1,
      resetSeconds: 60
    });
    const distLimiter = new RateLimiter(distRedis);
    const resDist = await distLimiter.checkLimit("id_2");
    expect(resDist.isDistributed).toBe(true);
  });

  it("RES-040: handles limit of 1 correctly", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    const first = await limiter.checkLimit("limit_1", 1, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);

    const second = await limiter.checkLimit("limit_1", 1, 60);
    expect(second.allowed).toBe(false);
  });

  it("RES-041: resetSeconds is never less than 1 while window is active", async () => {
    vi.useFakeTimers();
    try {
      const limiter = new RateLimiter(new RedisService({}));
      await limiter.checkLimit("near_expiry", 5, 2);

      vi.advanceTimersByTime(1900); // 100ms before expiry

      const res = await limiter.checkLimit("near_expiry", 5, 2);
      expect(res.resetSeconds).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-042: handles high volume burst requests consistently", async () => {
    const limiter = new RateLimiter(new RedisService({}));
    const promises: Promise<Awaited<ReturnType<RateLimiter["checkLimit"]>>>[] = [];
    for (let i = 0; i < 20; i++) {
      promises.push(limiter.checkLimit("burst_user", 15, 60));
    }
    const results = await Promise.all(promises);
    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;

    expect(allowedCount).toBe(15);
    expect(blockedCount).toBe(5);
  });

  // 4. CircuitBreaker (RES-043 to RES-055)
  it("RES-043: initializes in CLOSED state", () => {
    const breaker = new CircuitBreaker();
    expect(breaker.state).toBe("CLOSED");
    expect(breaker.canExecute()).toBe(true);
  });

  it("RES-044: remains CLOSED on failures below threshold", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 5 });
    for (let i = 0; i < 4; i++) {
      breaker.recordFailure();
      expect(breaker.state).toBe("CLOSED");
      expect(breaker.canExecute()).toBe(true);
    }
  });

  it("RES-045: transitions to OPEN when failureThreshold is reached", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe("CLOSED");
    breaker.recordFailure(); // 3rd failure
    expect(breaker.state).toBe("OPEN");
    expect(breaker.canExecute()).toBe(false);
  });

  it("RES-046: canExecute returns false while OPEN before recoveryTimeMs elapses", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, recoveryTimeMs: 10000 });
    breaker.recordFailure();
    expect(breaker.state).toBe("OPEN");
    expect(breaker.canExecute()).toBe(false);
  });

  it("RES-047: transitions from OPEN to HALF_OPEN after recoveryTimeMs elapses", () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker({ failureThreshold: 1, recoveryTimeMs: 5000 });
      breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");

      vi.advanceTimersByTime(5100);

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.state).toBe("HALF_OPEN");
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-048: in HALF_OPEN, a single failure trips immediately back to OPEN", () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker({ failureThreshold: 3, recoveryTimeMs: 5000 });
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");

      vi.advanceTimersByTime(5100);
      breaker.canExecute(); // triggers HALF_OPEN
      expect(breaker.state).toBe("HALF_OPEN");

      breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");
      expect(breaker.canExecute()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-049: in HALF_OPEN, consecutive successes close the circuit breaker", () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeMs: 5000,
        successThreshold: 2
      });
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");

      vi.advanceTimersByTime(5100);
      breaker.canExecute(); // enters HALF_OPEN
      expect(breaker.state).toBe("HALF_OPEN");

      breaker.recordSuccess(); // 1st success
      expect(breaker.state).toBe("HALF_OPEN");

      breaker.recordSuccess(); // 2nd success -> transitions to CLOSED
      expect(breaker.state).toBe("CLOSED");
      expect(breaker.canExecute()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-050: success in CLOSED state resets failure count", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe("CLOSED");

    breaker.recordSuccess(); // resets failures
    breaker.recordFailure(); // failure count is 1, not 3
    expect(breaker.state).toBe("CLOSED");
  });

  it("RES-051: reset() manually restores CLOSED state from OPEN", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    breaker.recordFailure();
    expect(breaker.state).toBe("OPEN");

    breaker.reset();
    expect(breaker.state).toBe("CLOSED");
    expect(breaker.canExecute()).toBe(true);
  });

  it("RES-052: uses default options: failureThreshold=5, recoveryTimeMs=15000, successThreshold=2", () => {
    const breaker = new CircuitBreaker();
    for (let i = 0; i < 4; i++) breaker.recordFailure();
    expect(breaker.state).toBe("CLOSED");
    breaker.recordFailure(); // 5th failure trips
    expect(breaker.state).toBe("OPEN");
  });

  it("RES-053: handles multiple OPEN -> HALF_OPEN -> OPEN cycles", () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker({ failureThreshold: 1, recoveryTimeMs: 2000 });
      breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");

      // Cycle 1
      vi.advanceTimersByTime(2100);
      breaker.canExecute();
      expect(breaker.state).toBe("HALF_OPEN");
      breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");

      // Cycle 2
      vi.advanceTimersByTime(2100);
      breaker.canExecute();
      expect(breaker.state).toBe("HALF_OPEN");
      breaker.recordFailure();
      expect(breaker.state).toBe("OPEN");
    } finally {
      vi.useRealTimers();
    }
  });

  it("RES-054: handles custom options with high failureThreshold (e.g. 50)", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 50 });
    for (let i = 0; i < 49; i++) {
      breaker.recordFailure();
    }
    expect(breaker.state).toBe("CLOSED");
    breaker.recordFailure();
    expect(breaker.state).toBe("OPEN");
  });

  it("RES-055: consecutive successes in CLOSED state do not corrupt internal state", () => {
    const breaker = new CircuitBreaker();
    for (let i = 0; i < 100; i++) {
      breaker.recordSuccess();
    }
    expect(breaker.state).toBe("CLOSED");
    expect(breaker.canExecute()).toBe(true);
  });
});
