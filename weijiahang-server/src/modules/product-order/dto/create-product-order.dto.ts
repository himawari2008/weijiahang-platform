import { IsString, IsArray, IsOptional, IsNumber, IsEnum, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** 单条商品项目 */
export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

/** 创建采购订单请求 */
export class CreateProductOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  /** 配送方式 */
  @IsString()
  deliveryMethod: string;

  /** 收件地址ID（配送时必填） */
  @IsOptional()
  @IsString()
  addressId?: string;

  /** 预约日期 */
  @IsOptional()
  @IsString()
  appointedDate?: string;

  /** 预约时段 */
  @IsOptional()
  @IsString()
  appointedTimeSlot?: string;

  /** 优惠券ID */
  @IsOptional()
  @IsString()
  couponId?: string;

  /** 使用积分数量 */
  @IsOptional()
  @IsNumber()
  usePoints?: number;

  /** 用户备注 */
  @IsOptional()
  @IsString()
  remark?: string;

  /** 配送费（前端计算或后端默认） */
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;
}
