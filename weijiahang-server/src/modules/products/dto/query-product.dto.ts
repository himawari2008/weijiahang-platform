import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryProductDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  /** 按市场筛选（通过 Shop → Market 关联） */
  @IsOptional()
  @IsString()
  marketId?: string;

  /** 按城市筛选（通过 Shop → Market 关联） */
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** 排序方式：sales(按销量) | newest(最新) | price_asc(价格升序) | price_desc(价格降序) | popular */
  @IsOptional()
  @IsString()
  sort?: string;

  /** limit 别名 = pageSize（前端习惯用 limit） */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
