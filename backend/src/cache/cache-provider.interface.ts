/**
 * CacheProvider Interface — Strategy Pattern
 *
 * Business logic depends on THIS interface, never on a concrete cache.
 * Swap implementations (Map vs Redis) by changing the module binding.
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const CACHE_PROVIDER = 'CACHE_PROVIDER';
