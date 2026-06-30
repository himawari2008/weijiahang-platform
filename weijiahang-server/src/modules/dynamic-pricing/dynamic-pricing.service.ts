import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';

/** 计算价格参数 */
export interface CalculatePriceParams {
  /** 服务类型：导航/陪同/验货 */
  serviceType: 'navigation' | 'accompany' | 'inspection';
  /** 店铺数量 */
  shopCount: number;
  /** 涉及品类列表 */
  categories: string[];
  /** 市场ID */
  marketId: string;
  /** 天气状况：sunny/cloudy/rain/storm */
  weather?: string;
  /** 当前在线领航员数（用于供需计算） */
  onlineNavigatorCount?: number;
  /** 当前待处理订单数 */
  pendingOrderCount?: number;
}

/** 明细项 */
export interface BreakdownItem {
  label: string;
  amount: number;
}

/** 价格计算结果 */
export interface PriceResult {
  base: number;
  breakdown: {
    basePrice: BreakdownItem;
    distanceSurcharge: BreakdownItem;
    complexitySurcharge: BreakdownItem;
    weatherSurcharge: BreakdownItem;
    timeSurcharge: BreakdownItem;
    demandSurcharge: BreakdownItem;
    skillBonus: BreakdownItem;
  };
  total: number;
}

/** 服务类型对应的基础价格 */
const BASE_PRICES: Record<string, number> = {
  navigation: 39,
  accompany: 150,
  inspection: 25,
};

/** 激增信息 */
export interface SurgeInfo {
  multiplier: number;
  level: string;
  ratio: number;
  pendingOrderCount: number;
  onlineNavigatorCount: number;
}

/**
 * 动态定价引擎
 * 纯计算服务（无实体依赖），根据服务类型、距离、品类复杂度、
 * 天气、时段、供需关系等多维度实时计算价格
 */
@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Navigator)
    private readonly navigatorRepo: Repository<Navigator>,
  ) {}

  /**
   * 主计算逻辑
   */
  calculatePrice(params: CalculatePriceParams): PriceResult {
    const now = new Date();
    const currentHour = now.getHours();

    // 1. 基础服务费
    const baseAmount = BASE_PRICES[params.serviceType] || 39;
    const basePrice: BreakdownItem = { label: '基础服务费', amount: baseAmount };

    // 2. 距离附加费（按店铺数量）
    let distanceAmount = 0;
    if (params.shopCount === 1) {
      distanceAmount = 0;
    } else if (params.shopCount >= 2 && params.shopCount <= 3) {
      distanceAmount = 10;
    } else if (params.shopCount > 3) {
      distanceAmount = 20;
    }
    const distanceSurcharge: BreakdownItem = { label: '距离附加费', amount: distanceAmount };

    // 3. 跨品类附加费
    const uniqueCategories = new Set(params.categories || []);
    const complexityAmount = uniqueCategories.size > 1 ? 10 : 0;
    const complexitySurcharge: BreakdownItem = { label: '跨品类附加费', amount: complexityAmount };

    // 4. 天气附加费
    let weatherAmount = 0;
    const weather = params.weather || 'sunny';
    if (weather === 'rain') weatherAmount = 10;
    else if (weather === 'storm') weatherAmount = 20;
    const weatherSurcharge: BreakdownItem = { label: '天气附加费', amount: weatherAmount };

    // 5. 时段附加费
    let timeAmount = 0;
    if (currentHour >= 8 && currentHour < 10) timeAmount = 5;
    else if (currentHour >= 12 && currentHour < 14) timeAmount = 3;
    else if (currentHour >= 17 && currentHour < 19) timeAmount = 5;
    else if (currentHour >= 21 && currentHour < 23) timeAmount = 8;
    const timeSurcharge: BreakdownItem = { label: '时段附加费', amount: timeAmount };

    // 6. 需求高峰附加费
    let demandAmount = 0;
    const onlineCount = params.onlineNavigatorCount ?? 0;
    const pendingCount = params.pendingOrderCount ?? 0;
    if (onlineCount > 0) {
      const ratio = pendingCount / onlineCount;
      if (ratio > 3) demandAmount = 15;
      else if (ratio > 2) demandAmount = 10;
    }
    const demandSurcharge: BreakdownItem = { label: '需求高峰附加费', amount: demandAmount };

    // 7. 专业技能费
    const skillBonus: BreakdownItem = { label: '专业技能费', amount: 5 };

    const total = baseAmount
      + distanceAmount
      + complexityAmount
      + weatherAmount
      + timeAmount
      + demandAmount
      + skillBonus.amount;

    return {
      base: baseAmount,
      breakdown: {
        basePrice,
        distanceSurcharge,
        complexitySurcharge,
        weatherSurcharge,
        timeSurcharge,
        demandSurcharge,
        skillBonus,
      },
      total,
    };
  }

  /**
   * 获取用户友好的价格估算
   * 返回包含明细说明的估算结果
   */
  getPriceEstimate(params: CalculatePriceParams) {
    const result = this.calculatePrice(params);

    const summary: string[] = [];
    for (const [, item] of Object.entries(result.breakdown)) {
      if (item.amount > 0) {
        summary.push(`${item.label}: +${item.amount}元`);
      }
    }

    return {
      basePrice: result.base,
      details: result.breakdown,
      summary,
      total: result.total,
      message: `预估总价 ${result.total} 元（含${summary.length}项附加费）`,
    };
  }

  /**
   * 获取当前市场的供需激增系数
   * 基于待处理订单数和在线领航员数计算
   */
  async getSurgeMultiplier(marketId: string): Promise<SurgeInfo> {
    const pendingOrderCount = await this.orderRepo.count({
      where: { targetMarketId: marketId, status: OrderStatus.PENDING },
    });

    const onlineNavigatorCount = await this.navigatorRepo.count({
      where: {
        currentMarketId: marketId,
        isOnline: true,
        isBusy: false,
        status: 1,
      },
    });

    const ratio = onlineNavigatorCount > 0
      ? pendingOrderCount / onlineNavigatorCount
      : pendingOrderCount > 0 ? 99 : 0;

    let multiplier = 1.0;
    let level = 'normal';

    if (ratio > 3) {
      multiplier = 1.5;
      level = 'high';
    } else if (ratio > 2) {
      multiplier = 1.3;
      level = 'medium';
    } else if (ratio > 1) {
      multiplier = 1.15;
      level = 'low';
    }

    return {
      multiplier,
      level,
      ratio: Math.round(ratio * 100) / 100,
      pendingOrderCount,
      onlineNavigatorCount,
    };
  }
}
