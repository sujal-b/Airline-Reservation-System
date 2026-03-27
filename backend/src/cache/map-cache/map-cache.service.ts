import { Injectable } from '@nestjs/common';
import { CacheProvider } from '../cache-provider.interface';

/**
 * In-Memory Map Cache — Development Strategy
 * Zero cost, zero setup. Uses a simple Map with optional TTL via setTimeout.
 */
@Injectable()
export class MapCacheService implements CacheProvider {
  private store = new Map<string, { value: unknown; expiry: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
