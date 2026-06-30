import {
  IsEnum, IsString, IsOptional, IsUUID, IsInt, Min, Max, IsArray, IsBoolean, MinLength, MaxLength,
} from 'class-validator';

export enum ReviewTargetType {
  SHOP = 'shop',
  NAVIGATOR = 'navigator',
}

export class CreateReviewDto {
  @IsUUID()
  orderId: string;

  @IsEnum(ReviewTargetType)
  targetType: ReviewTargetType;

  @IsUUID()
  targetId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priceRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  content?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
