import { IsEnum, IsString, IsOptional, IsUUID, IsArray, IsDateString, IsNumber } from 'class-validator';
import { ServiceType } from '../../../database/entities/order.entity';

export class CreateOrderDto {
  @IsUUID()
  userId: string;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  targetShops?: string[];

  @IsUUID()
  targetMarketId: string;

  @IsOptional()
  budgetRange?: { min?: number; max?: number; unit?: string };

  @IsOptional()
  @IsDateString()
  expectedStart?: Date;
}
