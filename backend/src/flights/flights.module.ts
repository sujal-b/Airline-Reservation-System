import { Module } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';
import { AviationstackService } from './aviationstack.service';

@Module({
  controllers: [FlightsController],
  providers: [FlightsService, AviationstackService],
  exports: [FlightsService],
})
export class FlightsModule {}
