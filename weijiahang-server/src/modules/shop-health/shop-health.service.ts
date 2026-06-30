import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Shop } from '../../database/entities/shop.entity';
import { Product } from '../../database/entities/product.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';

export interface HealthReport {
  shopId: string;
  totalScore: number;
  rating: string;
  dimensions: {
    productRichness: { score: number; maxScore: number; weight: number; suggestion?: string };
    infoCompleteness: { score: number; maxScore: number; weight: number; suggestion?: string };
    responseSpeed: { score: number; maxScore: number; weight: number; suggestion?: string };
    reviewPerformance: { score: number; maxScore: number; weight: number; suggestion?: string };
    transactionActivity: { score: number; maxScore: number; weight: number; suggestion?: string };
    promotionInput: { score: number; maxScore: number; weight: number; suggestion?: string };
  };
  suggestions: string[];
}

@Injectable()
export class ShopHealthService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  // Calculate health score for a shop
  async calculateHealth(shopId: string): Promise<HealthReport> {
    const shop = await this.shopRepo.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('店铺不存在');

    const dimensions: any = {};

    // 1. 商品丰富度 (20%)
    const productCount = await this.productRepo.count({ where: { shopId, isOnSale: true } as any });
    let productScore = 0;
    if (productCount >= 50) productScore = 100;
    else if (productCount >= 30) productScore = 80;
    else if (productCount >= 10) productScore = 60;
    else productScore = 30;
    dimensions.productRichness = {
      score: productScore,
      maxScore: 100,
      weight: 0.2,
      suggestion: productScore < 60 ? '建议上架更多商品，至少达到10件，推荐30件以上' : undefined,
    };

    // 2. 信息完整度 (15%) - 5 items × 20pts each
    let infoScore = 0;
    infoScore += shop.businessLicenseUrl ? 20 : 0;
    infoScore += shop.shopImage ? 20 : 0;
    infoScore += shop.images && Array.isArray(shop.images) && shop.images.length > 0 ? 20 : 0;
    infoScore += shop.bizHoursStart && shop.bizHoursEnd ? 20 : 0;
    infoScore += shop.announcement ? 20 : 0;
    dimensions.infoCompleteness = {
      score: infoScore,
      maxScore: 100,
      weight: 0.15,
      suggestion: infoScore < 80 ? '请完善店铺信息：营业执照、门头照、店内照、营业时间、公告' : undefined,
    };

    // 3. 响应速度 (20%)
    const recentOrders = await this.orderRepo.find({
      where: { shopId, status: OrderStatus.COMPLETED },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    let responseScore = 30; // default low
    if (recentOrders.length > 0) {
      // Calculate average time from order creation to acceptance
      const quickOrders = recentOrders.filter(o => {
        if (o.actualStart && o.createdAt) {
          const diff = o.actualStart.getTime() - o.createdAt.getTime();
          return diff < 15 * 60 * 1000; // 15 min
        }
        return false;
      }).length;
      const quickRate = quickOrders / recentOrders.length;
      if (quickRate >= 0.8) responseScore = 100;
      else if (quickRate >= 0.5) responseScore = 80;
      else if (quickRate >= 0.3) responseScore = 60;
    }
    dimensions.responseSpeed = {
      score: responseScore,
      maxScore: 100,
      weight: 0.2,
      suggestion: responseScore < 60 ? '建议提高订单响应速度，及时处理客户需求' : undefined,
    };

    // 4. 评价表现 (20%)
    const ratingScore = Math.min(100, (shop.rating || 5) / 5 * 100);
    dimensions.reviewPerformance = {
      score: Math.round(ratingScore),
      maxScore: 100,
      weight: 0.2,
      suggestion: ratingScore < 80 ? '建议提升服务质量，增加好评率' : undefined,
    };

    // 5. 交易活跃度 (15%)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyOrders = await this.orderRepo.count({
      where: { shopId, createdAt: { $gte: monthStart } } as any,
    });
    let activityScore = 0;
    if (monthlyOrders >= 30) activityScore = 100;
    else if (monthlyOrders >= 15) activityScore = 80;
    else if (monthlyOrders >= 5) activityScore = 60;
    else if (monthlyOrders >= 1) activityScore = 40;
    else activityScore = 10;
    dimensions.transactionActivity = {
      score: activityScore,
      maxScore: 100,
      weight: 0.15,
      suggestion: activityScore < 60 ? '本月交易较少，建议参与平台推广活动提升曝光' : undefined,
    };

    // 6. 推广投入 (10%)
    const promoScore = shop.isPromoted ? 100 : 0;
    dimensions.promotionInput = {
      score: promoScore,
      maxScore: 100,
      weight: 0.1,
      suggestion: promoScore === 0 ? '参与平台推广可提升店铺曝光和销量' : undefined,
    };

    // Calculate total score
    let totalScore = 0;
    const suggestions: string[] = [];
    for (const [key, dim] of Object.entries(dimensions)) {
      totalScore += (dim as any).score * (dim as any).weight;
      if ((dim as any).suggestion) {
        suggestions.push((dim as any).suggestion);
      }
    }
    totalScore = Math.round(totalScore);

    return {
      shopId,
      totalScore,
      rating: this.getScoreRating(totalScore),
      dimensions,
      suggestions,
    };
  }

  // Get score rating text
  getScoreRating(totalScore: number): string {
    if (totalScore >= 90) return '优秀';
    if (totalScore >= 75) return '良好';
    if (totalScore >= 60) return '一般';
    return '待优化';
  }
}
