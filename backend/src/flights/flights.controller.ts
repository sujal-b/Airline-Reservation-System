import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { CreateFlightDto, SearchFlightsDto } from './dto/flight.dto';
import { AviationstackService } from './aviationstack.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Flights')
@Controller('flights')
export class FlightsController {
  constructor(
    private readonly flightsService: FlightsService,
    private readonly aviationstackService: AviationstackService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a flight (admin)' })
  create(@Body() dto: CreateFlightDto) {
    return this.flightsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all local flights' })
  findAll() {
    return this.flightsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search local flights' })
  search(@Query() dto: SearchFlightsDto) {
    return this.flightsService.search(dto);
  }

  @Get('live')
  @ApiOperation({ summary: 'Search live flights via AviationStack (India)' })
  @ApiQuery({
    name: 'dep',
    required: true,
    description: 'Departure IATA code (e.g. DEL)',
  })
  @ApiQuery({
    name: 'arr',
    required: true,
    description: 'Arrival IATA code (e.g. BOM)',
  })
  async searchLive(@Query('dep') dep: string, @Query('arr') arr: string) {
    const rawFlights = await this.aviationstackService.searchFlights(
      dep.toUpperCase(),
      arr.toUpperCase(),
    );

    return rawFlights.map((f) => ({
      flightIata:
        f.flight?.iata ||
        `${f.airline?.iata || '??'}${f.flight?.number || '000'}`,
      airline: f.airline?.name || 'Unknown Airline',
      airlineIata: f.airline?.iata || '',
      departure: {
        airport: f.departure?.airport || '',
        iata: f.departure?.iata || dep,
        scheduled: f.departure?.scheduled || '',
        terminal: f.departure?.terminal,
        gate: f.departure?.gate,
      },
      arrival: {
        airport: f.arrival?.airport || '',
        iata: f.arrival?.iata || arr,
        scheduled: f.arrival?.scheduled || '',
        terminal: f.arrival?.terminal,
        gate: f.arrival?.gate,
      },
      status: f.flight_status || 'scheduled',
      flightDate: f.flight_date || '',
      aircraft: f.aircraft?.iata || null,
    }));
  }

  @Get('seat-map')
  @ApiOperation({ summary: 'Get seat map for a flight (generated on the fly)' })
  @ApiQuery({ name: 'flightNumber', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'basePrice', required: true, type: Number })
  getSeatMap(
    @Query('flightNumber') flightNumber: string,
    @Query('date') date: string,
    @Query('basePrice') basePrice: string,
  ) {
    return this.flightsService.getSeatMap(
      flightNumber,
      date,
      Number(basePrice),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flight by ID (with seats)' })
  findOne(@Param('id') id: string) {
    return this.flightsService.findOne(id);
  }
}
