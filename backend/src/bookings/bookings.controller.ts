import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) {
    // IDOR Protection: Override whatever userId the frontend sends with the cryptographically verified one
    dto.userId = user.id;
    return this.bookingsService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    // Only return bookings for the logged-in user
    return this.bookingsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Service level must also ideally check if booking.userId === user.id
    return this.bookingsService.findOne(id, user.id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.cancel(id, user.id);
  }

  @Post(':id/seats')
  changeSeats(@Param('id') id: string, @Body() body: { seatNumbers: string[] }, @CurrentUser() user: any) {
    return this.bookingsService.changeSeats(id, body.seatNumbers, user.id);
  }
}
