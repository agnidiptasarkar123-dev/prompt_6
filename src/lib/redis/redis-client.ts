// SPDX-License-Identifier: Apache-2.0
import { Redis } from "@upstash/redis";

export interface RedisConfig {
  readonly url?: string;
  readonly token?: string;
  readonly client?: Redis;
}

export class RedisService {
  private readonly client: Redis | null = null;
  private readonly inMemoryStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(urlOrConfig?: string | RedisConfig, token?: string) {
    const config = typeof urlOrConfig === "string" ? { url: urlOrConfig, token } : (urlOrConfig || {});
    if (config.client) {
      this.client = config.client;
      return;
    }
    const url = config.url || process.env["UPSTASH_REDIS_REST_URL"];
    const tok = config.token || process.env["UPSTASH_REDIS_REST_TOKEN"];

    if (url && tok) {
      try {
        this.client = new Redis({ url, token: tok });
      } catch {
        this.client = null;
      }
    }
  }

  public isDistributed(): boolean {
    return this.client !== null;
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        const data = await this.client.get<T>(key);
        return data;
      } catch {
        // Fall back to memory on temporary network glitch
      }
    }

    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return null;
    }
    try {
      return JSON.parse(item.value) as T;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.client) {
      try {
        await this.client.set(key, serialized, { ex: ttlSeconds });
        return;
      } catch {
        // Fall back to memory
      }
    }

    this.inMemoryStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  public async del(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fall back to memory
      }
    }
    this.inMemoryStore.delete(key);
  }

  public async clearMemory(): Promise<void> {
    this.inMemoryStore.clear();
  }

  public async incrementRateLimit(
    key: string,
    windowSeconds: number
  ): Promise<{ count: number; resetSeconds: number } | null> {
    if (this.client) {
      try {
        // Atomic Lua script: INCR + conditional EXPIRE + TTL query executed atomically in 1 server transaction
        const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;
        let results: [number, number];
        if (typeof this.client.eval === "function") {
          results = (await this.client.eval(
            RATE_LIMIT_LUA,
            [key],
            [windowSeconds]
          )) as [number, number];
        } else {
          const pipeline = this.client.pipeline();
          pipeline.incr(key);
          pipeline.ttl(key);
          const pResults = await pipeline.exec<[number, number]>();
          const count = pResults[0];
          let ttl = pResults[1];
          if (count === 1 || ttl === -1) {
            await this.client.expire(key, windowSeconds);
            ttl = windowSeconds;
          }
          results = [count, ttl];
        }
        if (Array.isArray(results) && results.length >= 2) {
          const count = Number(results[0]);
          const ttl = Number(results[1]);
          if (!isNaN(count) && !isNaN(ttl)) {
            return { count, resetSeconds: ttl > 0 ? ttl : windowSeconds };
          }
        }
        return null;
      } catch (err: unknown) {
        console.error("Redis distributed rate limit error:", err);
        return null;
      }
    }

    // In-memory rate limiting fallback (DEVELOPMENT / LOCAL TESTING ONLY)
    if (process.env.NODE_ENV === "production") {
      // In production: FAIL CLOSED. Never use per-instance in-memory counters as a replacement for distributed rate limiting.
      console.error("[CRITICAL] Production rate limiting requires a distributed Redis backend (UPSTASH_REDIS_REST_URL/TOKEN).");
      return null;
    }

    const now = Date.now();
    const existing = this.inMemoryStore.get(key);
    if (existing && existing.expiresAt > now) {
      const count = (parseInt(existing.value, 10) || 0) + 1;
      existing.value = count.toString();
      const resetSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
      return { count, resetSeconds };
    } else {
      const expiresAt = now + windowSeconds * 1000;
      this.inMemoryStore.set(key, { value: "1", expiresAt });
      return { count: 1, resetSeconds: windowSeconds };
    }
  }
}

export const globalRedisService = new RedisService();
export const UpstashRedisClient = RedisService;
