import { IsString, IsOptional, IsArray, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** 领航员资料更新 DTO */
export class UpdateNavigatorDto {
  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: '所属市场ID列表', example: ['uuid-1', 'uuid-2'] })
  @IsOptional()
  @IsArray()
  homeMarkets?: string[];

  @ApiPropertyOptional({ description: '专业技能标签', example: ['瓷砖', '地板', '卫浴'] })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiPropertyOptional({ description: '从业年限', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  experienceYears?: number;
}
