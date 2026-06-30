import { IsString, IsOptional } from 'class-validator';

export class QueryAdDto {
  @IsString()
  position: string;
}

export class UpdateAdStatusDto {
  @IsOptional()
  status?: number;
}
