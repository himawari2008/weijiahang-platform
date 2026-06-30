import {
  IsEnum, IsString, IsOptional, IsUUID, IsNumber, Min, Max, IsDateString,
} from 'class-validator';
import { AdType } from '../../../database/entities/ad.entity';

export class CreateAdDto {
  @IsUUID()
  shopId: string;

  @IsEnum(AdType)
  adType: AdType;

  @IsString()
  adPosition: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyBudget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999.99)
  cpcBid?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
