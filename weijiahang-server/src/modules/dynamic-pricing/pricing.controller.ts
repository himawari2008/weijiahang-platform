import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { DynamicPricingService, CalculatePriceParams } from './dynamic-pricing.service';
import { Public } from '../../common/decorators/public.decorator';

/** 动态定价 — 价格估算公开访问 */
@Public()
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: DynamicPricingService) {}

  /**
   * 计算订单价格
   * POST /api/v1/pricing/calculate
   */
  @Post('calculate')
  async calculate(@Body() params: CalculatePriceParams) {
    return this.pricingService.calculatePrice(params);
  }

  /**
   * 获取价格估算（用户友好版）
   * POST /api/v1/pricing/estimate
   */
  @Post('estimate')
  async estimate(@Body() params: CalculatePriceParams) {
    return this.pricingService.getPriceEstimate(params);
  }

  /**
   * 获取当前市场的供需激增信息
   * GET /api/v1/pricing/surge/:marketId
   */
  @Get('surge/:marketId')
  async surge(@Param('marketId') marketId: string) {
    return this.pricingService.getSurgeMultiplier(marketId);
  }
}
