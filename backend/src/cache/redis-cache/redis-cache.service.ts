import { Injectable, Logger } from '@nestjs/common';
import { CacheProvider } from '../cache-provider.interface';

/**
 * Redis Cache — Production Strategy
 * Drop in your Upstash Redis credentials and this becomes
 * the active cache strategy with zero code change in business logic.
 *
 * For now, this is a skeleton. Provide UPSTASH_REDIS_URL and
 * UPSTASH_REDIS_TOKEN in env, and install @upstash/redis.
 */
@Injectable()
export class RedisCacheService implements CacheProvider {
  private readonly logger = new Logger(RedisCacheService.name);

  // TODO: Inject Redis client from @upstash/redis when credentials available
  // private redis = new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN });

  async get<T>(key: string): Promise<T | null> {
    this.logger.warn(
      'RedisCacheService.get() called but Redis is not configured yet.',
    );
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.logger.warn(
      'RedisCacheService.set() called but Redis is not configured yet.',
    );
  }

  async del(key: string): Promise<void> {
    this.logger.warn(
      'RedisCacheService.del() called but Redis is not configured yet.',
    );
  }

  async clear(): Promise<void> {
    this.logger.warn(
      'RedisCacheService.clear() called but Redis is not configured yet.',
    );
  }
}
