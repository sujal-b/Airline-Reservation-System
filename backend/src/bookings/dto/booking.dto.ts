import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  userId: string;

  @IsString()
  flightNumber: string;

  @IsString()
  airline: string;

  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsString()
  departureTime: string;

  @IsString()
  arrivalTime: string;

  @IsNumber()
  basePrice: number;

  @IsArray()
  @IsString({ each: true })
  seatNumbers: string[];

  @IsOptional()
  @IsString()
  passengerName?: string;

  @IsOptional()
  @IsString()
  passengerEmail?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  meal?: string;

  @IsOptional()
  @IsNumber()
  checkedBags?: number;

  @IsOptional()
  @IsBoolean()
  hasCancellationProtection?: boolean;
}
