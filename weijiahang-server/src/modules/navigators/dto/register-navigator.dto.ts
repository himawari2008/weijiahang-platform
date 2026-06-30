import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 领航员实名注册 DTO */
export class RegisterNavigatorDto {
  @ApiProperty({ description: '真实姓名', example: '张三' })
  @IsNotEmpty({ message: '真实姓名不能为空' })
  @IsString()
  @MaxLength(20)
  realName: string;

  @ApiProperty({ description: '身份证号', example: '110101199001011234' })
  @IsNotEmpty({ message: '身份证号不能为空' })
  @IsString()
  @MaxLength(18)
  idCard: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '身份证正面照URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  idCardFront?: string;

  @ApiPropertyOptional({ description: '身份证反面照URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  idCardBack?: string;

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
