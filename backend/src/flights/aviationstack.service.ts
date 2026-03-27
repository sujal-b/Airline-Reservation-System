import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CacheProvider } from '../cache/cache-provider.interface.js';
import { CACHE_PROVIDER } from '../cache/cache-provider.interface.js';

export interface AviationFlightResult {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    scheduled: string;
    estimated: string;
    actual: string | null;
    terminal: string | null;
    gate: string | null;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    scheduled: string;
    estimated: string;
    actual: string | null;
    terminal: string | null;
    gate: string | null;
  };
  airline: {
    name: string;
    iata: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
  };
  aircraft: {
    registration: string;
    iata: string;
    icao: string;
  } | null;
}

@Injectable()
export class AviationstackService {
  private readonly logger = new Logger(AviationstackService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'http://api.aviationstack.com/v1';

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_PROVIDER) private readonly cacheProvider: CacheProvider,
  ) {
    this.apiKey = this.configService.get<string>('AVIATIONSTACK_API_KEY') || '';
  }

  async searchFlights(
    depIata: string,
    arrIata: string,
  ): Promise<AviationFlightResult[]> {
    const cacheKey = `avstack:${depIata}:${arrIata}`;

    // Check cache first (15 min TTL)
    const cached =
      await this.cacheProvider.get<AviationFlightResult[]>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT for ${depIata} → ${arrIata}`);
      return cached;
    }

    this.logger.log(
      `Cache MISS — calling AviationStack: ${depIata} → ${arrIata}`,
    );

    try {
      const url = `${this.baseUrl}/flights?access_key=${this.apiKey}&dep_iata=${depIata}&arr_iata=${arrIata}&limit=25`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error(
          `AviationStack API error: ${JSON.stringify(data.error)}`,
        );
        return [];
      }

      const flights: AviationFlightResult[] = data.data || [];

      // Cache for 15 minutes (900 seconds)
      await this.cacheProvider.set(cacheKey, flights, 900);

      return flights;
    } catch (error) {
      this.logger.error(`AviationStack fetch failed: ${error}`);
      return [];
    }
  }
}
