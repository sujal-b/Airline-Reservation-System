import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_PROVIDER } from '../cache/cache-provider.interface';
import type { CacheProvider } from '../cache/cache-provider.interface';
import { CreateFlightDto, SearchFlightsDto } from './dto/flight.dto';

@Injectable()
export class FlightsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: CacheProvider,
  ) {}

  async create(dto: CreateFlightDto) {
    const flight = await this.prisma.flight.create({
      data: {
        flightNumber: dto.flightNumber,
        origin: dto.origin,
        destination: dto.destination,
        departureTime: new Date(dto.departureTime),
        arrivalTime: new Date(dto.arrivalTime),
        aircraftId: dto.aircraftId,
        basePrice: dto.basePrice,
      },
      include: { aircraft: true },
    });
    await this.cache.del('flights:all');
    return flight;
  }

  async findAll() {
    const cached = await this.cache.get<any[]>('flights:all');
    if (cached) return cached;

    const flights = await this.prisma.flight.findMany({
      include: { aircraft: true, seats: true },
      orderBy: { departureTime: 'asc' },
    });
    await this.cache.set('flights:all', flights, 300);
    return flights;
  }

  async findOne(id: string) {
    // Directly retrieve from database instead of caching
    const flight = await this.prisma.flight.findUnique({
      where: { id },
      include: { aircraft: true, seats: { orderBy: { seatNumber: 'asc' } } },
    });
    if (!flight) throw new NotFoundException(`Flight ${id} not found`);

    return flight;
  }

  /**
   * Generates a 180-seat map on the fly.
   * Only reads from the DB to check if the flight exists and which seats are marked isAvailable=false.
   * Zero DB writes occur here.
   */
  async getSeatMap(flightNumber: string, dateStr: string, basePrice: number) {
    let depDate = new Date(dateStr);
    if (isNaN(depDate.getTime())) depDate = new Date();

    // Check if flight exists in DB for this date range
    const startOfDay = new Date(depDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(depDate);
    endOfDay.setHours(23, 59, 59, 999);

    const flight = await this.prisma.flight.findFirst({
      where: {
        flightNumber,
        departureTime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        seats: { where: { isAvailable: false } },
      },
    });

    // If flight exists, any seat in this list is booked. If it doesn't exist, list is empty.
    const bookedSeatNumbers = new Set(
      flight?.seats.map((s) => s.seatNumber) || [],
    );

    // Generate in-memory seat map (180 seats)
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = 30; // 30 rows * 6 cols = 180 seats
    const seats: any[] = [];

    for (let r = 1; r <= rows; r++) {
      for (const c of cols) {
        const seatClass =
          r <= 3 ? 'FIRST_CLASS' : r <= 8 ? 'BUSINESS' : 'ECONOMY';
        const price =
          seatClass === 'FIRST_CLASS'
            ? Math.round(basePrice * 2.5)
            : seatClass === 'BUSINESS'
              ? Math.round(basePrice * 1.5)
              : basePrice;

        const seatNumber = `${r}${c}`;

        seats.push({
          id: `tmp-${seatNumber}`, // Temporary ID for frontend rendering
          seatNumber,
          seatClass,
          price,
          isAvailable: !bookedSeatNumbers.has(seatNumber),
        });
      }
    }

    return {
      flightNumber,
      seats,
    };
  }

  async search(dto: SearchFlightsDto) {
    const cacheKey = `flights:search:${JSON.stringify(dto)}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (dto.origin)
      where.origin = { contains: dto.origin, mode: 'insensitive' };
    if (dto.destination)
      where.destination = { contains: dto.destination, mode: 'insensitive' };
    if (dto.departureDate) {
      const date = new Date(dto.departureDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureTime = { gte: date, lt: nextDay };
    }
    if (dto.minPrice || dto.maxPrice) {
      where.basePrice = {};
      if (dto.minPrice) where.basePrice.gte = dto.minPrice;
      if (dto.maxPrice) where.basePrice.lte = dto.maxPrice;
    }

    const flights = await this.prisma.flight.findMany({
      where,
      include: { aircraft: true, seats: { where: { isAvailable: true } } },
      orderBy: { departureTime: 'asc' },
    });
    await this.cache.set(cacheKey, flights, 300);
    return flights;
  }
}
