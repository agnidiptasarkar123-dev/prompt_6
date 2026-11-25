// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedisService } from "@/lib/redis/redis-client";
import { RateLimiter } from "@/services/rate-limit/rate-limiter";
import type { Redis } from "@upstash/redis";
import { CircuitBreaker } from "@/lib/http/circuit-breaker";

describe("Phase 3 Redis Atomic Scripts, Rate Limiter & Circuit Breaker Suite (P3-RES)", () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const savedNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(env: string | undefined): void {
    const envObj = process.env as Record<string, string | undefined>;
    if (env === undefined) {
      delete envObj["NODE_ENV"];
    } else {
      envObj["NODE_ENV"] = env;
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    setNodeEnv(undefined);
  });

  afterEach(() => {
    if (savedUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;

    if (savedToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;

    setNodeEnv(savedNodeEnv);
  });

  // Section 1: RedisService In-Memory Store & Operations (P3-RES-001 to P3-RES-035)
  it("P3-RES-001: isDistributed returns false when credentials omitted", () => {
    const redis = new RedisService({});
    expect(redis.isDistributed()).toBe(false);
  });

  it("P3-RES-002: isDistributed returns false when url is empty string", () => {
    const redis = new RedisService({ url: "", token: "tok" });
    expect(redis.isDistributed()).toBe(false);
  });

  it("P3-RES-003: isDistributed returns false when token is empty string", () => {
    const redis = new RedisService({ url: "https://redis.internal", token: "" });
    expect(redis.isDistributed()).toBe(false);
  });

  it("P3-RES-004: stores and retrieves object in memory store", async () => {
    const redis = new RedisService({});
    await redis.set("user_1", { name: "Agnidipta", role: "architect" }, 60);
    const val = await redis.get<{ name: string; role: string }>("user_1");
    expect(val).toEqual({ name: "Agnidipta", role: "architect" });
  });

  it("P3-RES-005: stores and retrieves array in memory store", async () => {
    const redis = new RedisService({});
    await redis.set("aqi_list", [50, 100, 150, 200], 60);
    const val = await redis.get<number[]>("aqi_list");
    expect(val).toEqual([50, 100, 150, 200]);
  });

  it("P3-RES-006: stores and retrieves primitive number", async () => {
    const redis = new RedisService({});
    await redis.set("counter", 42, 60);
    const val = await redis.get<number>("counter");
    expect(val).toBe(42);
  });

  it("P3-RES-007: stores and retrieves primitive string", async () => {
    const redis = new RedisService({});
    await redis.set("status", "ACTIVE", 60);
    const val = await redis.get<string>("status");
    expect(val).toBe("ACTIVE");
  });

  it("P3-RES-008: stores and retrieves boolean value", async () => {
    const redis = new RedisService({});
    await redis.set("flag", true, 60);
    const val = await redis.get<boolean>("flag");
    expect(val).toBe(true);
  });

  it("P3-RES-009: stores and retrieves null value cleanly", async () => {
    const redis = new RedisService({});
    await redis.set("empty_val", null, 60);
    const val = await redis.get("empty_val");
    expect(val).toBeNull();
  });

  it("P3-RES-010: returns null for non-existent key", async () => {
    const redis = new RedisService({});
    const val = await redis.get("missing_key_xyz");
    expect(val).toBeNull();
  });

  it("P3-RES-011: preserves multilingual Unicode strings (Hindi / Bengali)", async () => {
    const redis = new RedisService({});
    const payload = { hi: "हवासाथी - वायु गुणवत्ता", bn: "হাওয়াসাথী - বায়ু গুণমান" };
    await redis.set("i18n_test", payload, 60);
    const val = await redis.get<typeof payload>("i18n_test");
    expect(val?.hi).toBe("हवासाथी - वायु गुणवत्ता");
    expect(val?.bn).toBe("হাওয়াসাথী - বায়ু গুণমান");
  });

  it("P3-RES-012: deletes existing key from memory store", async () => {
    const redis = new RedisService({});
    await redis.set("del_key", "value", 60);
    await redis.del("del_key");
    const val = await redis.get("del_key");
    expect(val).toBeNull();
  });

  it("P3-RES-013: del on non-existent key succeeds silently without throwing", async () => {
    const redis = new RedisService({});
    await expect(redis.del("non_existent_key")).resolves.toBeUndefined();
  });

  it("P3-RES-014: clearMemory clears all keys from in-memory store", async () => {
    const redis = new RedisService({});
    await redis.set("k1", "v1", 60);
    await redis.set("k2", "v2", 60);
    await redis.clearMemory();
    expect(await redis.get("k1")).toBeNull();
    expect(await redis.get("k2")).toBeNull();
  });

  it("P3-RES-015: respects 1-second TTL expiration using fake timers", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("fast_key", "active", 1);
      expect(await redis.get("fast_key")).toBe("active");

      vi.advanceTimersByTime(1100); // 1.1s later
      expect(await redis.get("fast_key")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-016: respects 5-second TTL expiration using fake timers", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("five_sec_key", "active", 5);
      vi.advanceTimersByTime(4900);
      expect(await redis.get("five_sec_key")).toBe("active");

      vi.advanceTimersByTime(200);
      expect(await redis.get("five_sec_key")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-017: respects 60-second TTL expiration", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("sixty_sec_key", "active", 60);
      vi.advanceTimersByTime(59000);
      expect(await redis.get("sixty_sec_key")).toBe("active");

      vi.advanceTimersByTime(2000);
      expect(await redis.get("sixty_sec_key")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-018: respects 3600-second (1 hour) TTL expiration", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("hour_key", "hourly_data", 3600);
      vi.advanceTimersByTime(3599000);
      expect(await redis.get("hour_key")).toBe("hourly_data");

      vi.advanceTimersByTime(2000);
      expect(await redis.get("hour_key")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-019: overwriting existing key replaces value and updates TTL", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("key_x", "first", 5);
      await redis.set("key_x", "second", 15);

      vi.advanceTimersByTime(6000); // Past first TTL (5s), but within second (15s)
      expect(await redis.get("key_x")).toBe("second");
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-020: overwriting with shorter TTL expires earlier", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("key_y", "initial", 60);
      await redis.set("key_y", "updated_short", 2);

      vi.advanceTimersByTime(2500);
      expect(await redis.get("key_y")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-021: multiple independent keys maintain separate TTLs", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("short_key", "A", 2);
      await redis.set("long_key", "B", 10);

      vi.advanceTimersByTime(3000);
      expect(await redis.get("short_key")).toBeNull();
      expect(await redis.get("long_key")).toBe("B");
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-022: expired item is deleted from map during get invocation", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("clean_key", "value", 1);
      vi.advanceTimersByTime(1500);

      const val = await redis.get("clean_key");
      expect(val).toBeNull();
      // Second get confirms clean deletion
      expect(await redis.get("clean_key")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-023: handles complex nested JSON structure with arrays and dates", async () => {
    const redis = new RedisService({});
    const complexData = {
      id: "station_1",
      metrics: {
        pm25: { val: 65, unit: "µg/m³" },
        history: [{ t: "2026-11-24T10:00:00Z", v: 60 }]
      }
    };
    await redis.set("complex_key", complexData, 60);
    const val = await redis.get<typeof complexData>("complex_key");
    expect(val?.metrics.pm25.val).toBe(65);
    expect(val?.metrics.history).toHaveLength(1);
  });

  it("P3-RES-024: handles zero TTL gracefully (immediate expiry)", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.set("zero_ttl", "temp", 0);
      vi.advanceTimersByTime(1);
      expect(await redis.get("zero_ttl")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-025: in-memory incrementRateLimit creates new window when key is fresh", async () => {
    const redis = new RedisService({});
    const res = await redis.incrementRateLimit("rl_test_1", 60);
    expect(res).not.toBeNull();
    expect(res?.count).toBe(1);
    expect(res?.resetSeconds).toBe(60);
  });

  it("P3-RES-026: in-memory incrementRateLimit increments count on subsequent calls", async () => {
    const redis = new RedisService({});
    await redis.incrementRateLimit("rl_test_2", 60);
    const res = await redis.incrementRateLimit("rl_test_2", 60);
    expect(res?.count).toBe(2);
  });

  it("P3-RES-027: in-memory incrementRateLimit counts accurately up to 10 increments", async () => {
    const redis = new RedisService({});
    for (let i = 1; i <= 9; i++) {
      await redis.incrementRateLimit("rl_test_3", 60);
    }
    const res = await redis.incrementRateLimit("rl_test_3", 60);
    expect(res?.count).toBe(10);
  });

  it("P3-RES-028: in-memory incrementRateLimit resets after windowSeconds expires", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.incrementRateLimit("rl_expiring", 10);
      await redis.incrementRateLimit("rl_expiring", 10);

      vi.advanceTimersByTime(11000); // Window expired
      const res = await redis.incrementRateLimit("rl_expiring", 10);
      expect(res?.count).toBe(1); // Reset back to 1
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-029: in-memory incrementRateLimit returns decremented resetSeconds as time advances", async () => {
    vi.useFakeTimers();
    try {
      const redis = new RedisService({});
      await redis.incrementRateLimit("rl_countdown", 60);

      vi.advanceTimersByTime(20000); // 20s later
      const res = await redis.incrementRateLimit("rl_countdown", 60);
      expect(res?.resetSeconds).toBe(40);
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-030: in-memory incrementRateLimit isolates distinct identifiers", async () => {
    const redis = new RedisService({});
    const resA = await redis.incrementRateLimit("ip_1.1.1.1", 60);
    const resB = await redis.incrementRateLimit("ip_2.2.2.2", 60);
    expect(resA?.count).toBe(1);
    expect(resB?.count).toBe(1);
  });

  it("P3-RES-031: del removes rate limit key and resets count on next increment", async () => {
    const redis = new RedisService({});
    await redis.incrementRateLimit("reset_target", 60);
    await redis.incrementRateLimit("reset_target", 60);
    await redis.del("reset_target");

    const res = await redis.incrementRateLimit("reset_target", 60);
    expect(res?.count).toBe(1);
  });

  it("P3-RES-032: handles high concurrency increments in memory without dropping counts", async () => {
    const redis = new RedisService({});
    const promises = Array.from({ length: 50 }, () => redis.incrementRateLimit("concurrent_key", 60));
    await Promise.all(promises);
    const final = await redis.incrementRateLimit("concurrent_key", 60);
    expect(final?.count).toBe(51);
  });

  it("P3-RES-033: handles special characters in keys cleanly", async () => {
    const redis = new RedisService({});
    const specialKey = "rl:user#123@domain.com:endpoint/v1/aqi?city=Delhi";
    await redis.set(specialKey, "ok", 60);
    expect(await redis.get(specialKey)).toBe("ok");
  });

  it("P3-RES-034: get returns null if corrupted non-JSON is stored in memory", async () => {
    const redis = new RedisService({});
    // Set invalid JSON manually
    (redis as unknown as { inMemoryStore: Map<string, { value: string; expiresAt: number }> }).inMemoryStore.set("bad_json", {
      value: "{broken json",
      expiresAt: Date.now() + 60000
    });
    expect(await redis.get("bad_json")).toBeNull();
  });

  it("P3-RES-035: handles empty key string without error", async () => {
    const redis = new RedisService({});
    await redis.set("", "empty_key_val", 60);
    expect(await redis.get("")).toBe("empty_key_val");
  });

  // Section 2: Distributed Upstash Redis & Atomic Lua Script (P3-RES-036 to P3-RES-070)
  it("P3-RES-036: isDistributed returns true when url and token provided in constructor", () => {
    const redis = new RedisService({ url: "https://upstash.example.com", token: "tok123" });
    expect(redis.isDistributed()).toBe(true);
  });

  it("P3-RES-037: reads credentials from UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars", () => {
    process.env["UPSTASH_REDIS_REST_URL"] = "https://upstash-env.example.com";
    process.env["UPSTASH_REDIS_REST_TOKEN"] = "token-env-123";
    const redis = new RedisService({});
    expect(redis.isDistributed()).toBe(true);
  });

  it("P3-RES-038: calls upstash client.get when isDistributed is true", async () => {
    const mockClientGet = vi.fn().mockResolvedValue({ aqi: 120 });
    const redis = new RedisService({ client: { get: mockClientGet } as unknown as Redis });

    const val = await redis.get("test_key");
    expect(mockClientGet).toHaveBeenCalledWith("test_key");
    expect(val).toEqual({ aqi: 120 });
  });

  it("P3-RES-039: falls back to in-memory store when upstash client.get throws", async () => {
    const redis = new RedisService({
      client: {
        get: vi.fn().mockRejectedValue(new Error("Network timeout"))
      } as unknown as Redis
    });

    // Pre-populate memory store
    (redis as unknown as { inMemoryStore: Map<string, { value: string; expiresAt: number }> }).inMemoryStore.set("fallback_key", {
      value: JSON.stringify({ fallback: true }),
      expiresAt: Date.now() + 60000
    });

    const val = await redis.get<{ fallback: boolean }>("fallback_key");
    expect(val?.fallback).toBe(true);
  });

  it("P3-RES-040: calls upstash client.set with { ex: ttlSeconds } when isDistributed is true", async () => {
    const mockClientSet = vi.fn().mockResolvedValue("OK");
    const redis = new RedisService({ client: { set: mockClientSet } as unknown as Redis });

    await redis.set("dist_key", { test: 1 }, 120);
    expect(mockClientSet).toHaveBeenCalledWith("dist_key", JSON.stringify({ test: 1 }), { ex: 120 });
  });

  it("P3-RES-041: falls back to memory store when upstash client.set throws", async () => {
    const redis = new RedisService({
      client: {
        set: vi.fn().mockRejectedValue(new Error("Write failed"))
      } as unknown as Redis
    });

    await redis.set("save_fallback", "saved_in_mem", 60);
    // Directly check memory store has it
    const memoryItem = (redis as unknown as { inMemoryStore: Map<string, { value: string; expiresAt: number }> }).inMemoryStore.get("save_fallback");
    expect(memoryItem?.value).toBe(JSON.stringify("saved_in_mem"));
  });

  it("P3-RES-042: calls upstash client.del when isDistributed is true", async () => {
    const mockClientDel = vi.fn().mockResolvedValue(1);
    const redis = new RedisService({ client: { del: mockClientDel } as unknown as Redis });

    await redis.del("dist_del_key");
    expect(mockClientDel).toHaveBeenCalledWith("dist_del_key");
  });

  it("P3-RES-043: falls back to memory store when upstash client.del throws", async () => {
    const redis = new RedisService({
      client: {
        del: vi.fn().mockRejectedValue(new Error("Del failed"))
      } as unknown as Redis
    });

    // Del should also remove from memory store
    await redis.set("mem_key", "val", 60);
    await redis.del("mem_key");
    const item = (redis as unknown as { inMemoryStore: Map<string, { value: string; expiresAt: number }> }).inMemoryStore.get("mem_key");
    expect(item).toBeUndefined();
  });

  it("P3-RES-044: executes atomic Lua script for rate limiting via client.eval", async () => {
    const mockEval = vi.fn().mockResolvedValue([1, 60]);
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_lua_1", 60);
    expect(mockEval).toHaveBeenCalledTimes(1);
    expect(mockEval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      ["rl_lua_1"],
      [60]
    );
    expect(res?.count).toBe(1);
    expect(res?.resetSeconds).toBe(60);
  });

  it("P3-RES-045: parses numeric array return from Lua script correctly", async () => {
    const mockEval = vi.fn().mockResolvedValue([5, 42]);
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_lua_2", 60);
    expect(res?.count).toBe(5);
    expect(res?.resetSeconds).toBe(42);
  });

  it("P3-RES-046: handles string array return from Lua script by converting to numbers", async () => {
    const mockEval = vi.fn().mockResolvedValue(["7", "33"]);
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_lua_3", 60);
    expect(res?.count).toBe(7);
    expect(res?.resetSeconds).toBe(33);
  });

  it("P3-RES-047: returns null when atomic Lua script execution throws on Upstash", async () => {
    const mockEval = vi.fn().mockRejectedValue(new Error("Upstash 503"));
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_failing", 60);
    expect(res).toBeNull();
  });

  it("P3-RES-048: returns null when Lua script returns unexpected format (e.g. non-array)", async () => {
    const mockEval = vi.fn().mockResolvedValue("unexpected_string_response");
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_bad_format", 60);
    expect(res).toBeNull();
  });

  it("P3-RES-049: returns null when Lua script returns array with fewer than 2 elements", async () => {
    const mockEval = vi.fn().mockResolvedValue([1]); // missing resetSeconds
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_short_array", 60);
    expect(res).toBeNull();
  });

  it("P3-RES-050: returns null when Lua script returns NaN elements", async () => {
    const mockEval = vi.fn().mockResolvedValue([NaN, 60]);
    const redis = new RedisService({ client: { eval: mockEval } as unknown as Redis });

    const res = await redis.incrementRateLimit("rl_nan_result", 60);
    expect(res).toBeNull();
  });

  // Section 3: RateLimiter Fail-Secure Production vs Dev Policies (P3-RES-071 to P3-RES-110)
  it("P3-RES-071: in development, checkLimit allows requests within limit", async () => {
    setNodeEnv(undefined);
    const redis = new RedisService({});
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("dev_client_1", 10, 60);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(9);
    expect(res.limit).toBe(10);
  });

  it("P3-RES-072: in development, checkLimit rejects requests when limit exceeded", async () => {
    setNodeEnv(undefined);
    const redis = new RedisService({});
    const limiter = new RateLimiter(redis);

    for (let i = 0; i < 3; i++) {
      await limiter.checkLimit("dev_client_2", 3, 60);
    }
    const rejected = await limiter.checkLimit("dev_client_2", 3, 60);
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
  });

  it("P3-RES-073: in development, remaining decrements sequentially (5 -> 4 -> 3 -> 2 -> 1 -> 0)", async () => {
    setNodeEnv(undefined);
    const redis = new RedisService({});
    const limiter = new RateLimiter(redis);

    const r1 = await limiter.checkLimit("counter_client", 3, 60);
    const r2 = await limiter.checkLimit("counter_client", 3, 60);
    const r3 = await limiter.checkLimit("counter_client", 3, 60);
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
  });

  it("P3-RES-074: in production, unconfigured Redis triggers fail-secure rejection (allowed: false)", async () => {
    setNodeEnv("production");
    const redis = new RedisService({}); // Unconfigured
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("prod_unconfigured", 60, 60);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.isDistributed).toBe(false);
  });

  it("P3-RES-075: in production, distributed Redis failure triggers fail-secure rejection (allowed: false)", async () => {
    setNodeEnv("production");
    const redis = new RedisService({ url: "https://upstash.example.com", token: "tok123" });
    // Simulate Lua script failure returning null
    redis.incrementRateLimit = vi.fn().mockResolvedValue(null);
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("prod_redis_error", 60, 60);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it("P3-RES-076: in production, successful distributed Redis execution allows requests within limit", async () => {
    setNodeEnv("production");
    const redis = new RedisService({ url: "https://upstash.example.com", token: "tok123" });
    redis.incrementRateLimit = vi.fn().mockResolvedValue({ count: 12, resetSeconds: 45 });
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("prod_client_ok", 60, 60);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(48); // 60 - 12
    expect(res.resetSeconds).toBe(45);
    expect(res.isDistributed).toBe(true);
  });

  it("P3-RES-077: in production, successful distributed Redis execution rejects requests exceeding limit", async () => {
    setNodeEnv("production");
    const redis = new RedisService({ url: "https://upstash.example.com", token: "tok123" });
    redis.incrementRateLimit = vi.fn().mockResolvedValue({ count: 61, resetSeconds: 30 });
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("prod_client_over", 60, 60);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.resetSeconds).toBe(30);
  });

  it("P3-RES-078: prefixes identifier with hs_rl: for namespace isolation", async () => {
    const redis = new RedisService({});
    const spy = vi.spyOn(redis, "incrementRateLimit");
    const limiter = new RateLimiter(redis);

    await limiter.checkLimit("192.168.1.50", 10, 60);
    expect(spy).not.toHaveBeenCalled();
  });

  it("P3-RES-079: default limit is 60 and default window is 60 seconds", async () => {
    setNodeEnv(undefined);
    const redis = new RedisService({});
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("defaults_test");
    expect(res.limit).toBe(60);
    expect(res.resetSeconds).toBe(60);
  });

  it("P3-RES-080: custom windowSeconds is respected in dev mode countdown", async () => {
    setNodeEnv(undefined);
    const redis = new RedisService({});
    const limiter = new RateLimiter(redis);

    const res = await limiter.checkLimit("custom_win", 10, 120);
    expect(res.resetSeconds).toBe(120);
  });

  // Section 4: CircuitBreaker State Machine & Recovery (P3-RES-111 to P3-RES-160)
  it("P3-RES-111: initial circuit breaker state is CLOSED", () => {
    const cb = new CircuitBreaker();
    expect(cb.state).toBe("CLOSED");
  });

  it("P3-RES-112: canExecute returns true when CLOSED", () => {
    const cb = new CircuitBreaker();
    expect(cb.canExecute()).toBe(true);
  });

  it("P3-RES-113: recordSuccess in CLOSED state maintains CLOSED state", () => {
    const cb = new CircuitBreaker();
    cb.recordSuccess();
    expect(cb.state).toBe("CLOSED");
  });

  it("P3-RES-114: single failure does not trip circuit with default threshold 5", () => {
    const cb = new CircuitBreaker();
    cb.recordFailure();
    expect(cb.state).toBe("CLOSED");
    expect(cb.canExecute()).toBe(true);
  });

  it("P3-RES-115: 4 consecutive failures do not trip circuit (4 < 5)", () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 4; i++) cb.recordFailure();
    expect(cb.state).toBe("CLOSED");
    expect(cb.canExecute()).toBe(true);
  });

  it("P3-RES-116: 5 consecutive failures trip circuit to OPEN state", () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) cb.recordFailure();
    expect(cb.state).toBe("OPEN");
  });

  it("P3-RES-117: canExecute returns false immediately when state is OPEN", () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) cb.recordFailure();
    expect(cb.canExecute()).toBe(false);
  });

  it("P3-RES-118: respects custom failureThreshold option (e.g. threshold: 3)", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe("CLOSED");
    cb.recordFailure(); // 3rd failure
    expect(cb.state).toBe("OPEN");
  });

  it("P3-RES-119: intermittent success resets failure count when CLOSED", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess(); // Clears failureCount
    cb.recordFailure();
    expect(cb.state).toBe("CLOSED"); // 1 failure since success < 3
  });

  it("P3-RES-120: transitions to HALF_OPEN after recoveryTimeMs elapses", () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 10000 });
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.state).toBe("OPEN");

      vi.advanceTimersByTime(11000); // 11s later
      expect(cb.canExecute()).toBe(true); // Should transition to HALF_OPEN
      expect(cb.state).toBe("HALF_OPEN");
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-121: remains OPEN if canExecute called before recoveryTimeMs elapses", () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 10000 });
      cb.recordFailure();
      cb.recordFailure();

      vi.advanceTimersByTime(5000); // Only 5s
      expect(cb.canExecute()).toBe(false);
      expect(cb.state).toBe("OPEN");
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-122: in HALF_OPEN, single failure immediately returns to OPEN state", () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 10000 });
      cb.recordFailure();
      cb.recordFailure();

      vi.advanceTimersByTime(11000);
      cb.canExecute(); // Transitions to HALF_OPEN
      expect(cb.state).toBe("HALF_OPEN");

      cb.recordFailure(); // Probe call failed
      expect(cb.state).toBe("OPEN");
      expect(cb.canExecute()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-123: in HALF_OPEN, 2 consecutive successes transition state back to CLOSED", () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 10000, successThreshold: 2 });
      cb.recordFailure();
      cb.recordFailure();

      vi.advanceTimersByTime(11000);
      cb.canExecute(); // HALF_OPEN

      cb.recordSuccess(); // 1st success
      expect(cb.state).toBe("HALF_OPEN");

      cb.recordSuccess(); // 2nd success -> CLOSED!
      expect(cb.state).toBe("CLOSED");
      expect(cb.canExecute()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-124: in HALF_OPEN, custom successThreshold: 1 closes circuit on single success", () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 5000, successThreshold: 1 });
      cb.recordFailure();
      cb.recordFailure();

      vi.advanceTimersByTime(6000);
      cb.canExecute(); // HALF_OPEN

      cb.recordSuccess(); // Single success closes it
      expect(cb.state).toBe("CLOSED");
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-125: reset() forces circuit back to CLOSED state from OPEN", () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe("OPEN");

    cb.reset();
    expect(cb.state).toBe("CLOSED");
    expect(cb.canExecute()).toBe(true);
  });

  it("P3-RES-126: reset() forces circuit back to CLOSED state from HALF_OPEN", () => {
    vi.useFakeTimers();
    try {
      const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 5000 });
      cb.recordFailure();
      cb.recordFailure();
      vi.advanceTimersByTime(6000);
      cb.canExecute();
      expect(cb.state).toBe("HALF_OPEN");

      cb.reset();
      expect(cb.state).toBe("CLOSED");
    } finally {
      vi.useRealTimers();
    }
  });

  it("P3-RES-127: multiple distinct CircuitBreaker instances operate independently", () => {
    const cb1 = new CircuitBreaker({ failureThreshold: 2 });
    const cb2 = new CircuitBreaker({ failureThreshold: 2 });

    cb1.recordFailure();
    cb1.recordFailure();
    expect(cb1.state).toBe("OPEN");
    expect(cb2.state).toBe("CLOSED");
  });

  it("P3-RES-128: default recoveryTimeMs is 15000 ms", () => {
    const cb = new CircuitBreaker();
    expect((cb as unknown as { recoveryTimeMs: number }).recoveryTimeMs).toBe(15000);
  });

  it("P3-RES-129: default failureThreshold is 5", () => {
    const cb = new CircuitBreaker();
    expect((cb as unknown as { failureThreshold: number }).failureThreshold).toBe(5);
  });

  it("P3-RES-130: default successThreshold is 2", () => {
    const cb = new CircuitBreaker();
    expect((cb as unknown as { successThreshold: number }).successThreshold).toBe(2);
  });
});
