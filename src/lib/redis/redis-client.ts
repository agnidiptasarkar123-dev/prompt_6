// SPDX-License-Identifier: Apache-2.0
import { Redis } from "@upstash/redis";

export interface RedisConfig {
  readonly url?: string;
  readonly token?: string;
}

export class RedisService {
  private readonly client: Redis | null = null;
  private readonly inMemoryStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(config: RedisConfig = {}) {
    const url = config.url || process.env["UPSTASH_REDIS_REST_URL"];
    const token = config.token || process.env["UPSTASH_REDIS_REST_TOKEN"];

    if (url && token) {
      try {
        this.client = new Redis({ url, token });
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
        const pipeline = this.client.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec<[number, number]>();
        const count = results[0];
        let ttl = results[1];
        if (count === 1 || ttl === -1) {
          await this.client.expire(key, windowSeconds);
          ttl = windowSeconds;
        }
        return { count, resetSeconds: ttl > 0 ? ttl : windowSeconds };
      } catch (err: unknown) {
        console.error("Redis distributed rate limit error:", err);
        return null;
      }
    }
    return null;
  }
}

export const globalRedisService = new RedisService();
