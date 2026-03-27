import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_PROVIDER } from '../cache/cache-provider.interface';
import type { CacheProvider } from '../cache/cache-provider.interface';
import { CreateBookingDto } from './dto/booking.dto';

/**
 * BookingsService
 *
 * Uses Prisma interactive transactions with pessimistic locking
 * (SELECT ... FOR UPDATE via raw SQL) to prevent double-booking.
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: CacheProvider,
  ) {}

  /**
   * Book seats on a flight (Just-In-Time).
   * Creates the flight if it doesn't exist.
   * Creates or claims seats if available. Throws ConflictException via Unique Constraint if taken.
   */
  async create(dto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert Flight
      let depDate = new Date(dto.departureTime);
      if (isNaN(depDate.getTime())) depDate = new Date();

      let arrDate = new Date(dto.arrivalTime);
      if (isNaN(arrDate.getTime())) {
        arrDate = new Date(depDate);
        arrDate.setHours(arrDate.getHours() + 2);
      }

      const aircraft = await tx.aircraft.findFirst({
        orderBy: { capacity: 'asc' },
      });
      if (!aircraft) throw new NotFoundException('No aircraft in DB');

      // We use findFirst then create instead of upsert to avoid some Prisma unique index gotchas on dates,
      // but findUnique on flightNumber is safe because it's @unique.
      const flight = await tx.flight.upsert({
        where: { flightNumber: dto.flightNumber },
        update: {},
        create: {
          flightNumber: dto.flightNumber,
          airline: dto.airline,
          origin: dto.origin,
          destination: dto.destination,
          departureTime: depDate,
          arrivalTime: arrDate,
          basePrice: dto.basePrice,
          aircraftId: aircraft.id,
        },
      });

      // 2. Just-In-Time Seat Lock / Insert
      if (!dto.seatNumbers || dto.seatNumbers.length === 0) {
        throw new ConflictException('No seats selected');
      }

      const confirmedSeats: any[] = [];
      for (const seatNum of dto.seatNumbers) {
        const existing = await tx.seat.findUnique({
          where: {
            flightId_seatNumber: { flightId: flight.id, seatNumber: seatNum },
          },
        });

        if (existing) {
          if (!existing.isAvailable) {
            throw new ConflictException(`Seat ${seatNum} is already booked!`);
          }
          // Pessimistic lock for an existing free seat
          const [locked] = await tx.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Seat" WHERE "id" = $1 FOR UPDATE`,
            existing.id,
          );
          if (!locked || !locked.isAvailable) {
            throw new ConflictException(`Seat ${seatNum} was just booked!`);
          }
          const updated = await tx.seat.update({
            where: { id: existing.id },
            data: { isAvailable: false },
          });
          confirmedSeats.push(updated);
        } else {
          // Seat doesn't exist yet, insert it on the fly
          const row = parseInt(seatNum.replace(/[A-Z]/g, ''), 10);
          const seatClass =
            row <= 3 ? 'FIRST_CLASS' : row <= 8 ? 'BUSINESS' : 'ECONOMY';
          const price =
            seatClass === 'FIRST_CLASS'
              ? Math.round(dto.basePrice * 2.5)
              : seatClass === 'BUSINESS'
                ? Math.round(dto.basePrice * 1.5)
                : dto.basePrice;

          try {
            const created = await tx.seat.create({
              data: {
                flightId: flight.id,
                seatNumber: seatNum,
                seatClass,
                price,
                isAvailable: false,
              },
            });
            confirmedSeats.push(created);
          } catch (error: any) {
            // P2002: Unique constraint failed
            if (error.code === 'P2002') {
              throw new ConflictException(`Seat ${seatNum} is already booked!`);
            }
            throw error;
          }
        }
      }

      // 3. Calculate total
      const seatsTotal = confirmedSeats.reduce(
        (sum, s) => sum + Number(s.price),
        0,
      );
      const baggageCost = (dto.checkedBags || 0) * 50;
      const mealCost =
        dto.meal === 'Vegetarian'
          ? 15
          : dto.meal === 'Vegan'
            ? 20
            : dto.meal === 'Halal'
              ? 25
              : dto.meal === 'Kosher'
                ? 30
                : 0;
      const insuranceCost = dto.hasCancellationProtection ? 35 : 0;
      const totalAmount = seatsTotal + baggageCost + mealCost + insuranceCost;

      // 3.5. Ensure User exists (Guest checkout fallback)
      let user = await tx.user.findUnique({ where: { id: dto.userId } });
      if (!user) {
        user = await tx.user.create({
          data: {
            id: dto.userId,
            email: dto.passengerEmail || `guest-${dto.userId}-${Date.now()}@example.com`,
            password: 'guest_password_' + Date.now(),
            name: dto.passengerName || 'Guest User',
          }
        });
      }

      // 4. Create booking
      const booking = await tx.booking.create({
        data: {
          userId: dto.userId,
          flightId: flight.id,
          totalAmount,
          status: 'CONFIRMED',
          passengerName: dto.passengerName || null,
          passengerEmail: dto.passengerEmail || null,
          documentId: dto.documentId || null,
          meal: dto.meal || 'Standard',
          checkedBags: dto.checkedBags || 0,
          hasCancellationProtection: dto.hasCancellationProtection || false,
          seats: {
            connect: confirmedSeats.map((s) => ({ id: s.id })),
          },
        },
        include: { seats: true, flight: true },
      });

      if (dto.userId) await this.cache.del(`bookings:user:${dto.userId}`);

      return booking;
    });
  }

  async findAll(userId?: string) {
    if (userId) {
      const cacheKey = `bookings:user:${userId}`;
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) return cached;

      const bookings = await this.prisma.booking.findMany({
        where: { userId },
        include: { flight: true, seats: true, user: true },
        orderBy: { createdAt: 'desc' },
      });
      await this.cache.set(cacheKey, bookings, 30); // 30s cache
      return bookings;
    }

    return this.prisma.booking.findMany({
      include: { flight: true, seats: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        flight: {
          include: { aircraft: true },
        },
        seats: true,
      },
    });

    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    if (booking.userId !== userId) throw new UnauthorizedException('You do not own this booking');

    return booking;
  }

  async cancel(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch booking with seats
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { seats: true },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.userId !== userId) throw new UnauthorizedException('You do not own this booking');
      if (booking.status === 'CANCELLED') throw new ConflictException('Already cancelled');
      // Release seats
      await tx.seat.updateMany({
        where: { id: { in: booking.seats.map((s) => s.id) } },
        data: { isAvailable: true, bookingId: null },
      });

      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { flight: true, seats: true },
      });

      // Invalidate caches
      await this.cache.del(`flight:${booking.flightId}`);
      await this.cache.del(`bookings:user:${booking.userId}`);

      return updated;
    });
  }

  async changeSeats(id: string, newSeatNumbers: string[], userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { seats: true, flight: true },
      });
      if (!booking) throw new NotFoundException(`Booking ${id} not found`);
      if (booking.userId !== userId) throw new UnauthorizedException('You do not own this booking');
      if (booking.status === 'CANCELLED') throw new ConflictException('Booking is cancelled');

      // 1. Release old seats
      const oldSeatIds = booking.seats.map((s) => s.id);
      await tx.seat.updateMany({
        where: { id: { in: oldSeatIds } },
        data: { isAvailable: true, bookingId: null },
      });

      // 2. Claim new seats
      const confirmedSeats: any[] = [];
      for (const seatNum of newSeatNumbers) {
        const existing = await tx.seat.findUnique({
          where: { flightId_seatNumber: { flightId: booking.flight.id, seatNumber: seatNum } }
        });

        if (existing) {
          // If it was someone else's seat, throw. If it was our old seat, it's fine.
          if (!existing.isAvailable && !oldSeatIds.includes(existing.id)) {
            throw new ConflictException(`Seat ${seatNum} is already booked!`);
          }
          const [locked] = await tx.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Seat" WHERE "id" = $1 FOR UPDATE`,
            existing.id
          );
          if (!locked || (!locked.isAvailable && !oldSeatIds.includes(locked.id))) {
             throw new ConflictException(`Seat ${seatNum} was just booked!`);
          }
          const updated = await tx.seat.update({
             where: { id: existing.id },
             data: { isAvailable: false, bookingId: booking.id }
          });
          confirmedSeats.push(updated);
        } else {
           const row = parseInt(seatNum.replace(/[A-Z]/g, ''), 10);
           const seatClass = row <= 3 ? 'FIRST_CLASS' : row <= 8 ? 'BUSINESS' : 'ECONOMY';
           const price = seatClass === 'FIRST_CLASS' ? Math.round(booking.flight.basePrice * 2.5) : seatClass === 'BUSINESS' ? Math.round(booking.flight.basePrice * 1.5) : booking.flight.basePrice;
           
           try {
             const created = await tx.seat.create({
                data: {
                  flightId: booking.flight.id,
                  seatNumber: seatNum,
                  seatClass,
                  price,
                  isAvailable: false,
                  bookingId: booking.id
                }
             });
             confirmedSeats.push(created);
           } catch (e: any) {
              if (e.code === 'P2002') throw new ConflictException(`Seat ${seatNum} is already booked!`);
              throw e;
           }
        }
      }

      // 3. Recalculate totalAmount
      const seatsTotal = confirmedSeats.reduce((sum, s) => sum + Number(s.price), 0);
      const baggageCost = (booking.checkedBags || 0) * 50;
      const mealCost = booking.meal === 'Vegetarian' ? 15 : booking.meal === 'Vegan' ? 20 : booking.meal === 'Halal' ? 25 : booking.meal === 'Kosher' ? 30 : 0;
      const insuranceCost = booking.hasCancellationProtection ? 35 : 0;
      const newTotalAmount = seatsTotal + baggageCost + mealCost + insuranceCost;

      const updatedBooking = await tx.booking.update({
         where: { id: booking.id },
         data: { totalAmount: newTotalAmount },
         include: { seats: true, flight: true }
      });

      // 4. Invalidate caches
      await this.cache.del(`flight:${booking.flightId}`);
      await this.cache.del(`bookings:user:${booking.userId}`);

      return updatedBooking;
    });
  }
}
