import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

/**
 * 定价引擎模块
 * 纯计算服务：客群定价 × 等级折扣 × 批量折扣
 * 不依赖数据库，可被任意模块引用
 */
@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
