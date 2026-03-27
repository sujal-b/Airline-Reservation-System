import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting scheduled database cleanup...');
    const now = new Date();
    
    // 1. Delete flights older than 24 hours (and cascade related records manually)
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    try {
      // Find old flights
      const oldFlights = await this.prisma.flight.findMany({
        where: { departureTime: { lt: cutoff } },
        select: { id: true }
      });

      if (oldFlights.length > 0) {
        const oldFlightIds = oldFlights.map(f => f.id);
        
        // Delete Bookings first (since they are related to Flight and Seat)
        const deletedBookings = await this.prisma.booking.deleteMany({
          where: { flightId: { in: oldFlightIds } }
        });
        
        // Delete Seats
        const deletedSeats = await this.prisma.seat.deleteMany({
          where: { flightId: { in: oldFlightIds } }
        });
        
        // Delete Flights
        const deletedFlightsResponse = await this.prisma.flight.deleteMany({
          where: { id: { in: oldFlightIds } }
        });

        this.logger.log(`Deleted ${deletedFlightsResponse.count} Flights, ${deletedBookings.count} Bookings, and ${deletedSeats.count} Seats older than 24h.`);
      }

      // 2. Delete Orphaned Seats (isAvailable: true, bookingId: null)
      // This happens when users cancel bookings or change seats. Since we don't need them, delete them.
      const orphanedSeats = await this.prisma.seat.deleteMany({
        where: { isAvailable: true, bookingId: null }
      });

      if (orphanedSeats.count > 0) {
        this.logger.log(`Cleaned up ${orphanedSeats.count} orphaned/released seats.`);
      }

      // 3. Delete Cancelled Bookings older than 72 hours
      const cancelledCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      const staleBookings = await this.prisma.booking.deleteMany({
        where: { 
          status: 'CANCELLED',
          updatedAt: { lt: cancelledCutoff }
        }
      });

      if (staleBookings.count > 0) {
         this.logger.log(`Cleaned up ${staleBookings.count} stale cancelled bookings.`);
      }

      this.logger.log('Database cleanup finished.');
    } catch (error) {
      this.logger.error('Failed during database cleanup', error);
    }
  }
}
