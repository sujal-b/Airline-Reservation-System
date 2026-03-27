import { Global, Module } from '@nestjs/common';
import { CACHE_PROVIDER } from './cache-provider.interface';
import { MapCacheService } from './map-cache/map-cache.service';
// import { RedisCacheService } from './redis-cache/redis-cache.service';

/**
 * CacheModule — Strategy Pattern Binding
 *
 * Development: MapCacheService (default, zero setup)
 * Production:  Swap to RedisCacheService by changing the useClass below.
 */
@Global()
@Module({
  providers: [
    {
      provide: CACHE_PROVIDER,
      useClass: MapCacheService,
      // PRODUCTION: swap to RedisCacheService
      // useClass: RedisCacheService,
    },
  ],
  exports: [CACHE_PROVIDER],
})
export class CacheModule {}
