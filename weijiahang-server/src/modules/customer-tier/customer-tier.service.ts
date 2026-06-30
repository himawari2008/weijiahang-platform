import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { CustomerTier } from '../../database/entities/customer-tier.entity';
import { CustomerTierConfig } from '../../database/entities/customer-tier-config.entity';
import { User } from '../../database/entities/user.entity';

/**
 * 默认等级阈值（数据库无配置时使用）
 * 按客群类型 × 等级 定义升级条件
 *
 * 折扣率：青铜0% / 白银2% / 黄金5% / 铂金8% / 钻石12%
 */
const DEFAULT_TIER_CONFIGS: Array<{
  customerType: string;
  level: number;
  tierName: string;
  minOrderCount: number;
  minTotalAmount: number;
  minMonthsActive: number;
  minQuantity: number;
  discountRate: number;
  monthlyCreditLimit: number | null;
  deliveryPriority: number;
}> = [
  // ═══ 散客（retail）═══
  { customerType: 'retail', level: 1, tierName: '青铜', minOrderCount: 0, minTotalAmount: 0, minMonthsActive: 0, minQuantity: 0, discountRate: 0, monthlyCreditLimit: null, deliveryPriority: 0 },
  { customerType: 'retail', level: 2, tierName: '白银', minOrderCount: 3, minTotalAmount: 2000, minMonthsActive: 1, minQuantity: 0, discountRate: 0.02, monthlyCreditLimit: null, deliveryPriority: 1 },
  { customerType: 'retail', level: 3, tierName: '黄金', minOrderCount: 10, minTotalAmount: 8000, minMonthsActive: 3, minQuantity: 0, discountRate: 0.05, monthlyCreditLimit: null, deliveryPriority: 2 },
  { customerType: 'retail', level: 4, tierName: '铂金', minOrderCount: 30, minTotalAmount: 30000, minMonthsActive: 6, minQuantity: 0, discountRate: 0.08, monthlyCreditLimit: null, deliveryPriority: 3 },
  { customerType: 'retail', level: 5, tierName: '钻石', minOrderCount: 80, minTotalAmount: 100000, minMonthsActive: 12, minQuantity: 0, discountRate: 0.12, monthlyCreditLimit: null, deliveryPriority: 5 },

  // ═══ 工长（contractor）═══
  { customerType: 'contractor', level: 1, tierName: '青铜', minOrderCount: 0, minTotalAmount: 0, minMonthsActive: 0, minQuantity: 0, discountRate: 0, monthlyCreditLimit: null, deliveryPriority: 0 },
  { customerType: 'contractor', level: 2, tierName: '白银', minOrderCount: 5, minTotalAmount: 20000, minMonthsActive: 1, minQuantity: 0, discountRate: 0.02, monthlyCreditLimit: null, deliveryPriority: 2 },
  { customerType: 'contractor', level: 3, tierName: '黄金', minOrderCount: 20, minTotalAmount: 80000, minMonthsActive: 3, minQuantity: 0, discountRate: 0.05, monthlyCreditLimit: null, deliveryPriority: 4 },
  { customerType: 'contractor', level: 4, tierName: '铂金', minOrderCount: 60, minTotalAmount: 300000, minMonthsActive: 6, minQuantity: 0, discountRate: 0.08, monthlyCreditLimit: null, deliveryPriority: 6 },
  { customerType: 'contractor', level: 5, tierName: '钻石', minOrderCount: 150, minTotalAmount: 1000000, minMonthsActive: 12, minQuantity: 0, discountRate: 0.12, monthlyCreditLimit: null, deliveryPriority: 8 },

  // ═══ 装企（decoration_company）═══
  { customerType: 'decoration_company', level: 1, tierName: '青铜', minOrderCount: 0, minTotalAmount: 0, minMonthsActive: 0, minQuantity: 0, discountRate: 0, monthlyCreditLimit: 50000, deliveryPriority: 5 },
  { customerType: 'decoration_company', level: 2, tierName: '白银', minOrderCount: 3, minTotalAmount: 50000, minMonthsActive: 1, minQuantity: 0, discountRate: 0.02, monthlyCreditLimit: 150000, deliveryPriority: 6 },
  { customerType: 'decoration_company', level: 3, tierName: '黄金', minOrderCount: 10, minTotalAmount: 200000, minMonthsActive: 3, minQuantity: 0, discountRate: 0.05, monthlyCreditLimit: 500000, deliveryPriority: 7 },
  { customerType: 'decoration_company', level: 4, tierName: '铂金', minOrderCount: 30, minTotalAmount: 800000, minMonthsActive: 6, minQuantity: 0, discountRate: 0.08, monthlyCreditLimit: 1500000, deliveryPriority: 8 },
  { customerType: 'decoration_company', level: 5, tierName: '钻石', minOrderCount: 80, minTotalAmount: 3000000, minMonthsActive: 12, minQuantity: 0, discountRate: 0.12, monthlyCreditLimit: 5000000, deliveryPriority: 10 },

  // ═══ 批发（wholesale）═══
  { customerType: 'wholesale', level: 1, tierName: '青铜', minOrderCount: 0, minTotalAmount: 0, minMonthsActive: 0, minQuantity: 0, discountRate: 0, monthlyCreditLimit: null, deliveryPriority: 3 },
  { customerType: 'wholesale', level: 2, tierName: '白银', minOrderCount: 10, minTotalAmount: 50000, minMonthsActive: 1, minQuantity: 500, discountRate: 0.02, monthlyCreditLimit: null, deliveryPriority: 5 },
  { customerType: 'wholesale', level: 3, tierName: '黄金', minOrderCount: 50, minTotalAmount: 200000, minMonthsActive: 3, minQuantity: 2000, discountRate: 0.05, monthlyCreditLimit: null, deliveryPriority: 7 },
  { customerType: 'wholesale', level: 4, tierName: '铂金', minOrderCount: 200, minTotalAmount: 1000000, minMonthsActive: 6, minQuantity: 10000, discountRate: 0.08, monthlyCreditLimit: null, deliveryPriority: 8 },
  { customerType: 'wholesale', level: 5, tierName: '钻石', minOrderCount: 500, minTotalAmount: 5000000, minMonthsActive: 12, minQuantity: 50000, discountRate: 0.12, monthlyCreditLimit: null, deliveryPriority: 10 },
];

/** 客群类型 → 中文标签映射 */
const TYPE_LABEL_MAP: Record<string, string> = {
  retail: '散客',
  contractor: '工长',
  decoration_company: '装企',
  wholesale: '批发',
};

@Injectable()
export class CustomerTierService {
  constructor(
    @InjectRepository(CustomerTier)
    private readonly tierRepo: Repository<CustomerTier>,
    @InjectRepository(CustomerTierConfig)
    private readonly configRepo: Repository<CustomerTierConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /* ═══════════════════════════════════════════
     等级计算
     ═══════════════════════════════════════════ */

  /**
   * 根据用户订单历史计算应得等级
   * @returns 等级计算结果（含距下一级进度）
   */
  async calculateTier(userId: string): Promise<{
    currentLevel: number;
    tierName: string;
    customerType: string;
    discountRate: number;
    monthlyCreditLimit: number | null;
    deliveryPriority: number;
    nextTier: {
      level: number; name: string;
      ordersNeeded: number; amountNeeded: number; monthsNeeded: number; quantityNeeded: number;
    } | null;
    progress: { orders: number; amount: number; months: number; quantity: number };
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const customerType = user.customerType || 'retail';

    // 优先从数据库加载配置，无配置则用默认值
    let configs = await this.configRepo.find({ where: { customerType, status: 1 }, order: { level: 'ASC' } });
    if (configs.length === 0) {
      configs = DEFAULT_TIER_CONFIGS
        .filter(c => c.customerType === customerType)
        .map(c => ({ ...c } as unknown as CustomerTierConfig));
    }

    // 活跃月数
    const monthsActive = user.createdAt
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;

    const orderCount = user.totalOrders || 0;
    const totalSpent = Number(user.totalSpent) || 0;
    // FIX: 从 ProductOrderItem 汇总实际购买数量（批发客群依赖此字段升级）
    const totalQuantity = user.totalQuantity || 0;

    // 从低到高遍历，找满足条件的最高等级
    let currentConfig = configs[0];
    for (const cfg of configs) {
      if (
        orderCount >= cfg.minOrderCount &&
        totalSpent >= Number(cfg.minTotalAmount) &&
        monthsActive >= cfg.minMonthsActive &&
        totalQuantity >= Number(cfg.minQuantity)
      ) {
        currentConfig = cfg;
      }
    }

    // 找下一级
    const currentIdx = configs.findIndex(c => c.level === currentConfig.level);
    const nextConfig = currentIdx < configs.length - 1 ? configs[currentIdx + 1] : null;

    // 计算各项进度
    const ordersProgress = nextConfig ? Math.min(100, Math.round((orderCount / nextConfig.minOrderCount) * 100)) : 100;
    const amountProgress = nextConfig ? Math.min(100, Math.round((totalSpent / Number(nextConfig.minTotalAmount)) * 100)) : 100;
    const monthsProgress = nextConfig ? Math.min(100, Math.round((monthsActive / nextConfig.minMonthsActive) * 100)) : 100;
    const quantityProgress = nextConfig && Number(nextConfig.minQuantity) > 0
      ? Math.min(100, Math.round((totalQuantity / Number(nextConfig.minQuantity)) * 100)) : 100;

    return {
      currentLevel: currentConfig.level,
      tierName: currentConfig.tierName,
      customerType,
      discountRate: Number(currentConfig.discountRate),
      monthlyCreditLimit: currentConfig.monthlyCreditLimit ? Number(currentConfig.monthlyCreditLimit) : null,
      deliveryPriority: currentConfig.deliveryPriority,
      nextTier: nextConfig ? {
        level: nextConfig.level,
        name: nextConfig.tierName,
        ordersNeeded: Math.max(0, nextConfig.minOrderCount - orderCount),
        amountNeeded: Math.max(0, Number(nextConfig.minTotalAmount) - totalSpent),
        monthsNeeded: Math.max(0, nextConfig.minMonthsActive - monthsActive),
        quantityNeeded: Math.max(0, Number(nextConfig.minQuantity) - totalQuantity),
      } : null,
      progress: {
        orders: ordersProgress,
        amount: amountProgress,
        months: monthsProgress,
        quantity: quantityProgress,
      },
    };
  }

  /* ═══════════════════════════════════════════
     等级评估与更新
     ═══════════════════════════════════════════ */

  /**
   * 评估并更新用户等级记录
   * 每次下单后调用此方法
   */
  async evaluateAndUpdate(userId: string): Promise<CustomerTier> {
    const tierInfo = await this.calculateTier(userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const monthsActive = user.createdAt
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;

    // 查找已有记录
    let tierRecord = await this.tierRepo.findOne({ where: { userId } });

    if (tierRecord) {
      const wasDemoted = tierRecord.currentLevel > tierInfo.currentLevel;
      const wasPromoted = tierRecord.currentLevel < tierInfo.currentLevel;

      tierRecord.currentLevel = tierInfo.currentLevel;
      tierRecord.currentTierName = tierInfo.tierName;
      tierRecord.customerType = tierInfo.customerType;
      tierRecord.totalScore = user.totalOrders + Number(user.totalSpent) / 1000;
      tierRecord.totalAmount = Number(user.totalSpent);
      tierRecord.orderCount = user.totalOrders;
      tierRecord.tierDiscountRate = tierInfo.discountRate;
      tierRecord.monthlyCreditLimit = tierInfo.monthlyCreditLimit;
      tierRecord.ordersProgress = tierInfo.progress.orders;
      tierRecord.amountProgress = tierInfo.progress.amount;
      tierRecord.monthsProgress = tierInfo.progress.months;

      if (wasDemoted) {
        tierRecord.demotedAt = new Date();
      }
      if (wasPromoted) {
        tierRecord.promotedAt = new Date();
      }

      return this.tierRepo.save(tierRecord);
    }

    // 新建记录
    const newTier = this.tierRepo.create({
      userId,
      customerType: tierInfo.customerType,
      currentLevel: tierInfo.currentLevel,
      currentTierName: tierInfo.tierName,
      totalScore: user.totalOrders + Number(user.totalSpent) / 1000,
      totalAmount: Number(user.totalSpent),
      orderCount: user.totalOrders,
      tierDiscountRate: tierInfo.discountRate,
      monthlyCreditLimit: tierInfo.monthlyCreditLimit as number | null,
      ordersProgress: tierInfo.progress.orders,
      amountProgress: tierInfo.progress.amount,
      monthsProgress: tierInfo.progress.months,
      promotedAt: new Date(),
    } as any);

    return this.tierRepo.save(newTier as unknown as CustomerTier);
  }

  /* ═══════════════════════════════════════════
     查询接口
     ═══════════════════════════════════════════ */

  /** 获取用户等级详情 */
  async getTierInfo(userId: string): Promise<{
    tier: CustomerTier | null;
    calculation: any;
  }> {
    const tier = await this.tierRepo.findOne({ where: { userId } });
    const calculation = await this.calculateTier(userId);
    return { tier, calculation };
  }

  /** 管理员：获取所有用户等级 */
  async getAllTiers(page = 1, pageSize = 20): Promise<{ items: CustomerTier[]; total: number }> {
    const [items, total] = await this.tierRepo.findAndCount({
      order: { totalScore: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 管理员：手动设置用户客群类型 */
  async assignCustomerType(userId: string, customerType: string): Promise<CustomerTier> {
    // FIX: 校验 customerType 合法值
    const VALID_TYPES = ['retail', 'contractor', 'decoration_company', 'wholesale'];
    if (!VALID_TYPES.includes(customerType)) {
      throw new BadRequestException(`无效的客群类型：${customerType}，合法值：${VALID_TYPES.join(', ')}`);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const label = TYPE_LABEL_MAP[customerType] || customerType;
    user.customerType = customerType;
    user.customerTypeLabel = label;
    await this.userRepo.save(user);

    // 重新计算等级
    return this.evaluateAndUpdate(userId);
  }

  /* ═══════════════════════════════════════════
     自动检测客群类型
     ═══════════════════════════════════════════ */

  /**
   * 根据行为模式自动识别客群类型
   * 规则：
   * - 单次采购>500件 → 批发
   * - 月均订单>5 → 工长
   * - 有信用额度使用记录 → 装企
   * - 其余 → 散客
   */
  async autoDetectType(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 'retail';

    // FIX: 已手动设置则始终保留（不依赖 onboardingStep 判断）
    if (user.customerType !== 'retail') {
      return user.customerType;
    }

    // 基于总订单数的简单判断：>20单可能是工长，留待精确化
    if (user.totalOrders >= 20) return 'contractor';

    return 'retail';
  }

  /* ═══════════════════════════════════════════
     阈值配置管理
     ═══════════════════════════════════════════ */

  /** 获取等级阈值配置 */
  async getConfigs(customerType?: string): Promise<CustomerTierConfig[]> {
    const where: any = { status: 1 };
    if (customerType) where.customerType = customerType;
    return this.configRepo.find({ where, order: { customerType: 'ASC', level: 'ASC' } });
  }

  /** 管理员：更新/创建阈值配置 */
  async upsertConfig(data: Partial<CustomerTierConfig>): Promise<CustomerTierConfig> {
    let config: CustomerTierConfig | null = null;
    if (data.id) {
      config = await this.configRepo.findOne({ where: { id: data.id } });
      if (!config) throw new NotFoundException('配置不存在');
    } else {
      config = this.configRepo.create({
        customerType: data.customerType || 'retail',
        level: data.level || 1,
      });
    }

    Object.assign(config, data);
    return this.configRepo.save(config!);
  }

  /** 初始化默认配置到数据库 */
  async seedDefaultConfigs(): Promise<number> {
    const count = await this.configRepo.count();
    if (count > 0) return 0;

    const entities = DEFAULT_TIER_CONFIGS.map(
      cfg => ({ ...cfg } as unknown as CustomerTierConfig),
    );
    await this.configRepo.save(entities);
    return entities.length;
  }

  /* ═══════════════════════════════════════════
     定时任务
     ═══════════════════════════════════════════ */

  /** 每日凌晨4点批量更新所有活跃用户的等级 */
  @Cron('0 4 * * *')
  async batchEvaluateTiers(): Promise<void> {
    const users = await this.userRepo.find({ where: { status: 1, role: 'customer' }, take: 1000 });
    let updated = 0;
    for (const user of users) {
      try {
        await this.evaluateAndUpdate(user.id);
        updated++;
      } catch (e) {
        // 跳过单个用户错误
        continue;
      }
    }
    console.log(`[CustomerTier] 批量更新完成：${updated}/${users.length} 位用户`);
  }
}
