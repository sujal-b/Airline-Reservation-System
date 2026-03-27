import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum FlightStatusDto {
  SCHEDULED = 'SCHEDULED',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class CreateFlightDto {
  @IsString()
  flightNumber: string;

  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsDateString()
  departureTime: string;

  @IsDateString()
  arrivalTime: string;

  @IsString()
  aircraftId: string;

  @IsNumber()
  basePrice: number;
}

export class SearchFlightsDto {
  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;
}
