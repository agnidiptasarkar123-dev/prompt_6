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
}

export const globalRedisService = new RedisService();
