import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 定价 API
 * 提供「预估价格」端点，供小程序结算页实时展示
 */
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  /** 预估整单价格（结算页调用） */
  @Public()
  @Post('calculate')
  async calculate(@Body() body: {
    items: Array<{ product: any; quantity: number }>;
    customerType?: string;
    tierLevel?: number;
  }) {
    // FIX: 校验 items 不为空，避免 500 错误
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('请提供商品列表');
    }
    const ct = body.customerType || 'retail';
    const tier = body.tierLevel || 1;
    return this.pricingService.calculateOrderTotal(body.items, ct, tier);
  }

  /** 预估配送费 */
  @Public()
  @Post('delivery-fee')
  async estimateDelivery(@Body() body: {
    customerType?: string;
    deliveryMethod: string;
    totalWeight?: number;
  }) {
    const fee = this.pricingService.estimateDeliveryFee(
      body.customerType || 'retail',
      body.deliveryMethod,
      body.totalWeight,
    );
    return { deliveryFee: fee };
  }
}
