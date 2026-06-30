import { Injectable } from '@nestjs/common';
import { Product } from '../../database/entities/product.entity';

/**
 * 定价计算结果
 */
export interface PriceBreakdown {
  /** 商品原价 */
  basePrice: number;
  /** 客群专属价（若无则为原价） */
  customerPrice: number;
  /** 等级折扣率（如 0.05 = 5%） */
  tierDiscountRate: number;
  /** 等级折扣金额 */
  tierDiscount: number;
  /** 批量折扣率 */
  volumeDiscountRate: number;
  /** 批量折扣金额 */
  volumeDiscount: number;
  /** 最终单价 */
  finalUnitPrice: number;
  /** 计算说明 */
  summary: string[];
}

/**
 * 定价引擎
 *
 * 计算逻辑：
 * 1. 基础价 → 客群专属价（tierPrices JSON）
 * 2. 客群价 → 等级折扣（青铜0% ~ 钻石12%）
 * 3. 折扣后 → 批量折扣（>100件 5% / >500件 10% / >1000件 15%）
 * 4. 最终单价
 *
 * 参考 DynamicPricing 纯计算引擎模式
 */
@Injectable()
export class PricingService {
  /**
   * 计算单品最终定价
   */
  calculateItemPrice(
    product: Product,
    customerType: string,
    tierLevel: number,
    quantity: number,
  ): PriceBreakdown {
    const summary: string[] = [];
    let price = Number(product.price) || 0;
    summary.push(`原价 ¥${price.toFixed(2)}`);

    // ═══ 第1步：客群专属价 ═══
    let tierPrice = price;
    const tierPrices = product.tierPrices || {};
    if (tierPrices[customerType] && Number(tierPrices[customerType]) > 0) {
      tierPrice = Number(tierPrices[customerType]);
      summary.push(`客群价(${customerType}) ¥${tierPrice.toFixed(2)}`);
    }

    // ═══ 第2步：等级折扣 ═══
    const tierDiscountRate = this.getTierDiscountRate(tierLevel);
    const tierDiscount = tierPrice * tierDiscountRate;
    const afterTierDiscount = tierPrice - tierDiscount;
    if (tierDiscountRate > 0) {
      summary.push(`等级折扣 ${(tierDiscountRate * 100).toFixed(0)}% → -¥${tierDiscount.toFixed(2)}`);
    }

    // ═══ 第3步：批量折扣 ═══
    const volumeDiscountRate = this.getVolumeDiscountRate(quantity);
    const volumeDiscount = afterTierDiscount * volumeDiscountRate;
    const finalUnitPrice = afterTierDiscount - volumeDiscount;
    if (volumeDiscountRate > 0) {
      summary.push(`批量折扣 ${(volumeDiscountRate * 100).toFixed(0)}% → -¥${volumeDiscount.toFixed(2)}`);
    }

    summary.push(`最终单价 ¥${finalUnitPrice.toFixed(2)}`);

    return {
      basePrice: price,
      customerPrice: tierPrice,
      tierDiscountRate,
      tierDiscount: Math.round(tierDiscount * 100) / 100,
      volumeDiscountRate,
      volumeDiscount: Math.round(volumeDiscount * 100) / 100,
      finalUnitPrice: Math.round(finalUnitPrice * 100) / 100,
      summary,
    };
  }

  /**
   * 计算整单定价汇总
   */
  calculateOrderTotal(
    items: Array<{
      product: Product;
      quantity: number;
    }>,
    customerType: string,
    tierLevel: number,
  ): {
    totalBasePrice: number;
    totalTierDiscount: number;
    totalVolumeDiscount: number;
    totalFinalAmount: number;
    items: Array<{ productId: string; productName: string; quantity: number; breakdown: PriceBreakdown }>;
  } {
    let totalBasePrice = 0;
    let totalTierDiscount = 0;
    let totalVolumeDiscount = 0;
    let totalFinalAmount = 0;
    const resultItems: Array<{ productId: string; productName: string; quantity: number; breakdown: PriceBreakdown }> = [];

    for (const item of items) {
      const breakdown = this.calculateItemPrice(item.product, customerType, tierLevel, item.quantity);

      totalBasePrice += breakdown.basePrice * item.quantity;
      totalTierDiscount += breakdown.tierDiscount * item.quantity;
      totalVolumeDiscount += breakdown.volumeDiscount * item.quantity;
      totalFinalAmount += breakdown.finalUnitPrice * item.quantity;

      resultItems.push({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        breakdown,
      });
    }

    return {
      totalBasePrice: Math.round(totalBasePrice * 100) / 100,
      totalTierDiscount: Math.round(totalTierDiscount * 100) / 100,
      totalVolumeDiscount: Math.round(totalVolumeDiscount * 100) / 100,
      totalFinalAmount: Math.round(totalFinalAmount * 100) / 100,
      items: resultItems,
    };
  }

  /* ═══════════════════════════════════════════
     折扣率查询
     ═══════════════════════════════════════════ */

  /** 等级折扣率：青铜0% / 白银2% / 黄金5% / 铂金8% / 钻石12% */
  getTierDiscountRate(tierLevel: number): number {
    const rates: Record<number, number> = {
      1: 0,
      2: 0.02,
      3: 0.05,
      4: 0.08,
      5: 0.12,
    };
    return rates[tierLevel] || 0;
  }

  /** 批量折扣率：>100件 5% / >500件 10% / >1000件 15% */
  getVolumeDiscountRate(quantity: number): number {
    if (quantity >= 1000) return 0.15;
    if (quantity >= 500) return 0.10;
    if (quantity >= 100) return 0.05;
    return 0;
  }

  /** 根据客群类型和距离估算配送费 */
  estimateDeliveryFee(
    customerType: string,
    deliveryMethod: string,
    totalWeight?: number,
  ): number {
    // 自提免配送费
    if (deliveryMethod === 'self_pickup') return 0;

    // 装企免配送费
    if (customerType === 'decoration_company') return 0;

    // 工长 + 领航员配送 → 优惠配送费
    if (customerType === 'contractor' && deliveryMethod === 'navigator_deliver') return 30;

    // 散客 + 领航员配送
    if (deliveryMethod === 'navigator_deliver') return 50;

    // 物流配送（按重量估算）
    if (deliveryMethod === 'logistics') return totalWeight ? Math.max(20, totalWeight * 2) : 50;

    return 0;
  }
}
