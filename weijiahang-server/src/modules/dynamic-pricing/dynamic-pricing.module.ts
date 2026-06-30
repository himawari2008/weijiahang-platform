import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { DynamicPricingService } from './dynamic-pricing.service';
import { PricingController } from './pricing.controller';

/**
 * 动态定价模块
 * 无自有实体，依赖 Order 和 Navigator 用于供需计算
 */
@Module({
  imports: [TypeOrmModule.forFeature([Order, Navigator])],
  controllers: [PricingController],
  providers: [DynamicPricingService],
  exports: [DynamicPricingService],
})
export class DynamicPricingModule {}
