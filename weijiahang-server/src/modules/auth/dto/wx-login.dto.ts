import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 微信小程序登录 DTO */
export class WxLoginDto {
  @ApiProperty({ description: '微信登录临时code', example: '033B1o0008U3zC1Twj000d7yTE3B1o0I' })
  @IsNotEmpty({ message: '登录code不能为空' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '用户头像URL（首次登录时传入）' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '用户昵称（首次登录时传入）' })
  @IsOptional()
  @IsString()
  nickname?: string;
}

/** 刷新Token DTO */
export class RefreshTokenDto {
  @ApiProperty({ description: '用户ID' })
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsString()
  userId: string;
}
