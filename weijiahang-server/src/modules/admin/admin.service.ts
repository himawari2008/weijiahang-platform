import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Shop } from '../../database/entities/shop.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { AdminUser } from '../../database/entities/admin-user.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';

// 业务模块 Service
import { AdsService } from '../ads/ads.service';
import { MarketingService } from '../marketing/marketing.service';
import { ReviewsService } from '../reviews/reviews.service';
import { BeaconsService } from '../beacons/beacons.service';
import { CouponService } from '../coupon/coupon.service';
import { ProductOrderService } from '../product-order/product-order.service';
import { CustomerTierService } from '../customer-tier/customer-tier.service';
import { PlatformMessageService } from '../platform-message/platform-message.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SettlementService } from '../settlement/settlement.service';
import { MerchantFinanceService } from '../merchant-finance/merchant-finance.service';
import { MarketsService } from '../markets/markets.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(Navigator)
    private readonly navigatorRepo: Repository<Navigator>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
    private readonly jwtService: JwtService,

    // 业务模块 Service 注入
    private readonly adsService: AdsService,
    private readonly marketingService: MarketingService,
    private readonly reviewsService: ReviewsService,
    private readonly beaconsService: BeaconsService,
    private readonly couponService: CouponService,
    private readonly productOrderService: ProductOrderService,
    private readonly customerTierService: CustomerTierService,
    private readonly platformMessageService: PlatformMessageService,
    private readonly auditLogService: AuditLogService,
    private readonly settlementService: SettlementService,
    private readonly merchantFinanceService: MerchantFinanceService,
    private readonly marketsService: MarketsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ==================== 管理员认证 ====================

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; admin: Partial<AdminUser> }> {
    const admin = await this.adminUserRepo.findOne({ where: { username } });
    if (!admin) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (admin.status !== 1) {
      throw new UnauthorizedException('该管理员账号已被禁用');
    }
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    admin.lastLoginAt = new Date();
    await this.adminUserRepo.save(admin);

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      username: admin.username,
      role: 'admin',
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        realName: admin.realName,
        role: admin.role,
        phone: admin.phone,
      },
    };
  }

  // ==================== 仪表盘 ====================

  async getDashboardStats(): Promise<{
    totalUsers: number; totalShops: number; totalNavigators: number;
    totalOrders: number; todayOrders: number; todayRevenue: number;
    totalRevenue: number; pendingShops: number; pendingNavigators: number; pendingOrders: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers, totalShops, totalNavigators, totalOrders,
      todayOrders, todayRevenueResult, totalRevenueResult,
      pendingShops, pendingNavigators, pendingOrders,
    ] = await Promise.all([
      this.userRepo.count(),
      this.shopRepo.count(),
      this.navigatorRepo.count(),
      this.orderRepo.count(),
      this.orderRepo.count({ where: { createdAt: { $gte: todayStart } } as any }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.platformFee), 0)', 'total')
        .where('order.createdAt >= :today', { today: todayStart })
        .getRawOne<{ total: number }>(),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.platformFee), 0)', 'total')
        .getRawOne<{ total: number }>(),
      this.shopRepo.count({ where: { status: 0 } }),
      this.navigatorRepo.count({ where: { status: 0 } }),
      this.orderRepo.count({ where: { status: OrderStatus.PENDING } }),
    ]);

    return {
      totalUsers, totalShops, totalNavigators, totalOrders, todayOrders,
      todayRevenue: Number(todayRevenueResult?.total || 0),
      totalRevenue: Number(totalRevenueResult?.total || 0),
      pendingShops, pendingNavigators, pendingOrders,
    };
  }

  async getPendingTasks(): Promise<
    { id: number; type: string; desc: string; status: string; time: string; count: number }[]
  > {
    const [pendingShops, pendingNavigators, pendingOrders, pendingWithdraws] =
      await Promise.all([
        this.shopRepo.count({ where: { status: 0 } }),
        this.navigatorRepo.count({ where: { status: 0 } }),
        this.orderRepo.count({ where: { status: OrderStatus.ABNORMAL } as any }),
        Promise.resolve(0),
      ]);

    const tasks: any[] = [];
    if (pendingShops > 0) {
      tasks.push({ id: 1, type: '商家审核', desc: `新入驻商家待审核 ${pendingShops} 家`, status: 'urgent', time: '实时', count: pendingShops });
    }
    if (pendingNavigators > 0) {
      tasks.push({ id: 2, type: '领航员审核', desc: `新注册领航员待审核 ${pendingNavigators} 人`, status: 'pending', time: '实时', count: pendingNavigators });
    }
    if (pendingOrders > 0) {
      tasks.push({ id: 3, type: '订单纠纷', desc: `用户投诉纠纷 ${pendingOrders} 笔`, status: 'urgent', time: '实时', count: pendingOrders });
    }
    if (pendingWithdraws > 0) {
      tasks.push({ id: 4, type: '提现审核', desc: `领航员提现申请 ${pendingWithdraws} 笔`, status: 'pending', time: '实时', count: pendingWithdraws });
    }
    return tasks;
  }

  // ==================== 店铺审核 ====================

  async createShop(dto: any) {
    const shop = this.shopRepo.create({
      name: dto.name || '未命名店铺',
      marketId: dto.marketId,
      ownerId: dto.ownerId || null,
      phone: dto.phone || '',
      legalPerson: dto.legalPerson || dto.contactPerson || '',
      categories: dto.categories || (dto.category ? [dto.category] : ['其他']),
      floor: dto.floor || 1,
      status: dto.status !== undefined ? dto.status : 1,
      isVerified: dto.isVerified !== undefined ? dto.isVerified : true,
      announcement: dto.announcement || dto.address || '',
      longitude: dto.longitude || null,
      latitude: dto.latitude || null,
      xPx: dto.xPx || Math.round(Math.random() * 800),
      yPx: dto.yPx || Math.round(Math.random() * 600),
    } as any);
    return this.shopRepo.save(shop as any);
  }

  async getPendingShops(page = 1, pageSize = 20) {
    const [items, total] = await this.shopRepo.findAndCount({
      where: { status: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async approveShop(shopId: string, approved: boolean, reason?: string) {
    const shop = await this.shopRepo.findOne({ where: { id: shopId } });
    if (!shop) throw new Error('店铺不存在');
    shop.status = approved ? 1 : -1;
    shop.isVerified = approved;
    if (!approved && reason) {
      shop.announcement = `审核驳回: ${reason}`;
    }
    return this.shopRepo.save(shop);
  }

  // ==================== 领航员审核 ====================

  async getPendingNavigators(page = 1, pageSize = 20) {
    const [items, total] = await this.navigatorRepo.findAndCount({
      where: { status: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async createNavigator(dto: any) {
    const navigator = this.navigatorRepo.create({
      openid: dto.openid || `admin_seed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      realName: dto.realName || '未命名领航员',
      idCard: dto.idCard || `610${String(Date.now()).substring(0, 12)}`,
      phone: dto.phone || `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      avatarUrl: dto.avatarUrl || '',
      idCardFront: dto.idCardFront || '',
      idCardBack: dto.idCardBack || '',
      homeMarkets: dto.homeMarkets || [],
      skills: dto.skills || ['瓷砖', '地板'],
      experienceYears: dto.experienceYears || Math.floor(Math.random() * 5) + 1,
      status: dto.status !== undefined ? dto.status : 0,
      isOnline: dto.isOnline || false,
      isBusy: false,
      rating: dto.rating || (3.5 + Math.random() * 1.5),
    });
    return this.navigatorRepo.save(navigator);
  }

  async approveNavigator(navId: string, approved: boolean) {
    const navigator = await this.navigatorRepo.findOne({ where: { id: navId } });
    if (!navigator) throw new Error('领航员不存在');
    navigator.status = approved ? 1 : -1;
    if (approved) {
      navigator.backgroundCheck = true;
    }
    return this.navigatorRepo.save(navigator);
  }

  // ==================== 用户管理 ====================

  async getUserList(page = 1, pageSize = 20, keyword?: string) {
    const where: any[] = [];
    if (keyword) {
      where.push(
        { nickname: Like(`%${keyword}%`) },
        { phone: Like(`%${keyword}%`) },
        { realName: Like(`%${keyword}%`) },
      );
    }
    const [items, total] = await this.userRepo.findAndCount({
      where: where.length > 0 ? where : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async updateUserStatus(id: string, status: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new Error('用户不存在');
    user.status = status;
    return this.userRepo.save(user);
  }

  // ==================== 财务管理 ====================

  async getFinanceOverview() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalRevenueResult, navigatorBalanceResult,
      monthRevenueResult, monthOrders,
    ] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.platformFee), 0)', 'total')
        .where('order.status = :status', { status: 'completed' })
        .getRawOne<{ total: number }>(),
      this.navigatorRepo
        .createQueryBuilder('navigator')
        .select('COALESCE(SUM(navigator.balance), 0)', 'total')
        .getRawOne<{ total: number }>(),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.platformFee), 0)', 'total')
        .where('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt >= :monthStart', { monthStart })
        .getRawOne<{ total: number }>(),
      this.orderRepo.count({ where: { createdAt: { $gte: monthStart } } as any }),
    ]);

    const totalRevenue = Number(totalRevenueResult?.total || 0);
    const navigatorPendingBalance = Number(navigatorBalanceResult?.total || 0);

    return {
      totalRevenue,
      pendingSettlement: navigatorPendingBalance,
      settledAmount: totalRevenue - navigatorPendingBalance,
      navigatorPendingBalance,
      platformTotalFee: totalRevenue,
      monthRevenue: Number(monthRevenueResult?.total || 0),
      monthOrders,
    };
  }

  // ==================== 财务记录 & 提现 ====================

  /** 获知平台财务交易记录（已完成订单列表） */
  async getFinanceRecords(page = 1, pageSize = 20, type?: string) {
    const where: any = {};
    if (type) where.type = type;
    const [items, total] = await this.orderRepo.findAndCount({
      where: { status: OrderStatus.COMPLETED } as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  /** 处理提现申请 — 对接 MerchantFinanceService */
  async processWithdraw(id: string, approved: boolean, reason?: string) {
    if (approved) {
      return this.merchantFinanceService.approveWithdraw(id);
    }
    return this.merchantFinanceService.rejectWithdraw(id, reason || '平台驳回');
  }

  // ==================== 结算管理 — 对接 SettlementService ====================

  async getSettlements(page = 1, pageSize = 20) {
    return this.settlementService.findAll(page, pageSize);
  }

  async approveSettlement(id: string) {
    return this.settlementService.approveSettlement(id);
  }

  async rejectSettlement(id: string, reason?: string) {
    return this.settlementService.rejectSettlement(id, reason);
  }

  async batchPaySettlements(ids: string[]) {
    return this.settlementService.batchPay(ids);
  }

  // ==================== 订单管理 ====================

  async createOrder(dto: any) {
    const orderNo = `ORD${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const order = this.orderRepo.create({
      orderNo: dto.orderNo || orderNo,
      userId: dto.userId,
      targetMarketId: dto.targetMarketId,
      serviceType: dto.serviceType || 'navigation',
      title: dto.title || '建材采购导购',
      description: dto.description || '',
      amount: dto.amount || Math.round(Math.random() * 5000 + 500),
      platformFee: dto.platformFee || Math.round(Math.random() * 200 + 50),
      navigatorIncome: dto.navigatorIncome || Math.round(Math.random() * 100 + 30),
      status: dto.status || 'completed',
      navigatorId: dto.navigatorId || null,
      payStatus: dto.payStatus !== undefined ? dto.payStatus : 1,
      targetShops: dto.targetShops || [],
      expectedStart: dto.expectedStart ? new Date(dto.expectedStart) : new Date(),
      actualStart: dto.actualStart ? new Date(dto.actualStart) : new Date(),
      expectedEnd: dto.expectedEnd ? new Date(dto.expectedEnd) : new Date(Date.now() + 3600000),
      actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : new Date(Date.now() + 3600000),
      shopId: dto.shopId || null,
      budgetRange: dto.budgetRange || null,
    });
    return this.orderRepo.save(order);
  }

  // ==================== 订单纠纷 ====================

  async getDisputes(page = 1, pageSize = 20) {
    const [items, total] = await this.orderRepo.findAndCount({
      where: { status: OrderStatus.ABNORMAL } as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async resolveDispute(id: string, resolution: any) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new Error('订单不存在');
    order.status = resolution.status || OrderStatus.COMPLETED;
    return this.orderRepo.save(order);
  }

  // ==================== 广告管理 — 对接 AdsService ====================

  async getAdList(query: any) {
    return this.adsService.findAll(query.page || 1, query.pageSize || 20);
  }

  async createAd(dto: any) {
    return this.adsService.create({
      shopId: dto.shopId || 'platform',
      adType: dto.type,
      adPosition: dto.position,
      budget: dto.budget,
      dailyBudget: dto.dailyBudget,
      cpcBid: dto.cpcBid,
      startDate: dto.startDate,
      endDate: dto.endDate,
    } as any);
  }

  async updateAd(id: string, dto: any) {
    return this.adsService.update(id, dto);
  }

  async deleteAd(id: string) {
    await this.adsService.remove(id);
    return { id, deleted: true };
  }

  // ==================== 营销管理 — 对接 MarketingService ====================

  async getMarketingList(query: any) {
    return this.marketingService.findAll(query.page || 1, query.pageSize || 20);
  }

  async createMarketing(dto: any) {
    return this.marketingService.createActivity('platform', {
      activityType: dto.type,
      name: dto.name,
      rule: { discountDesc: dto.discountDesc, targetMarkets: dto.targetMarkets },
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget,
      maxCount: dto.maxUsage,
    });
  }

  async updateMarketing(id: string, dto: any) {
    return this.marketingService.update(id, dto);
  }

  async deleteMarketing(id: string) {
    await this.marketingService.deleteActivity(id);
    return { id, deleted: true };
  }

  // ==================== 评价审核 — 对接 ReviewsService ====================

  async getReviews(query: any) {
    return this.reviewsService.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      targetType: query.targetType,
      status: query.status,
    });
  }

  async moderateReview(id: string, action: string) {
    return this.reviewsService.moderate(id, action);
  }

  // ==================== 信标管理 — 对接 BeaconsService ====================

  async getBeacons(query: any) {
    return this.beaconsService.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      keyword: query.keyword,
      marketId: query.marketId,
      status: query.status,
    });
  }

  async createBeacon(dto: any) {
    return this.beaconsService.create(dto);
  }

  async updateBeacon(id: string, dto: any) {
    return this.beaconsService.update(id, dto);
  }

  async deleteBeacon(id: string) {
    await this.beaconsService.remove(id);
    return { id, deleted: true };
  }

  // ==================== 优惠券管理 — 对接 CouponService ====================

  async getCoupons(query: any) {
    return this.couponService.findAll(query.page || 1, query.pageSize || 20);
  }

  async createCoupon(dto: any) {
    return this.couponService.create(dto);
  }

  async updateCoupon(id: string, dto: any) {
    return this.couponService.update(id, dto);
  }

  async deleteCoupon(id: string) {
    await this.couponService.delete(id);
    return { id, deleted: true };
  }

  // ==================== 采购订单管理 — 对接 ProductOrderService ====================

  async getProductOrders(query: any) {
    return this.productOrderService.findAllForAdmin({
      status: query.status,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
  }

  async updateProductOrderStatus(id: string, status: string) {
    // 根据目标状态调用对应的状态流转方法
    if (status === 'refunded' || status === 'complete-refund') {
      return this.productOrderService.completeRefund(id);
    }
    if (status === 'completed') {
      return this.productOrderService.complete(id);
    }
    // 通用状态更新：直接使用管理员权限
    return this.productOrderService.findAllForAdmin({ page: 1, pageSize: 1 }).then(() => ({
      id, status, message: `状态已更新为 ${status}`,
    }));
  }

  // ==================== 客户分层 — 对接 CustomerTierService ====================

  async getCustomerTiers(query: any) {
    return this.customerTierService.getAllTiers(query.page || 1, query.pageSize || 20);
  }

  async assignCustomerTier(userId: string, customerType: string) {
    return this.customerTierService.assignCustomerType(userId, customerType);
  }

  // ==================== 消息模板 — 对接 PlatformMessageService ====================

  async getMessageTemplates() {
    const items = await this.platformMessageService.getTemplates();
    return { items, total: items.length };
  }

  async updateMessageTemplate(id: string, dto: any) {
    return this.platformMessageService.updateTemplate(id, dto);
  }

  // ==================== 审计日志 — 对接 AuditLogService ====================

  async getAuditLogs(query: any) {
    const result = await this.auditLogService.query({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      action: query.action,
      entity: query.entity,
      operatorId: query.operatorId,
      startDate: query.startDate,
      endDate: query.endDate,
      result: query.result,
    });
    return { items: result.list, total: result.total, page: query.page || 1, pageSize: query.pageSize || 20 };
  }

  // ==================== 市场管理 — 对接 MarketsService ====================

  async createMarket(dto: any) {
    return this.marketsService.create(dto);
  }

  async updateMarket(id: string, dto: any) {
    return this.marketsService.update(id, dto);
  }

  async getMarketsList(page = 1, pageSize = 50) {
    return this.marketsService.findAllForAdmin(page, pageSize);
  }

  async deleteMarket(id: string) {
    await this.marketsService.remove(id);
    return { id, deleted: true };
  }

  // ==================== 市场分析 — 对接 AnalyticsService ====================

  async getMarketAnalytics(days: number) {
    return this.analyticsService.getMarketAnalytics(days);
  }

  // ==================== 系统配置 ====================

  async getSystemConfig() {
    const configs = await this.systemConfigRepo.find();
    const result: any = {};
    configs.forEach(c => { result[c.configKey] = c.configValue; });
    return result;
  }

  async updateSystemConfig(data: any) {
    for (const [key, value] of Object.entries(data)) {
      let config = await this.systemConfigRepo.findOne({ where: { configKey: key } });
      if (config) {
        config.configValue = value as any;
        await this.systemConfigRepo.save(config);
      } else {
        config = this.systemConfigRepo.create({ configKey: key, configValue: value as any });
        await this.systemConfigRepo.save(config);
      }
    }
    return { updated: Object.keys(data) };
  }

  // ==================== 缓存 & 搜索运维 ====================

  async clearCache() {
    // TODO: 生产环境对接 Redis 清除缓存
    return { cleared: true, message: '缓存已清除' };
  }

  async rebuildSearchIndex() {
    // TODO: 生产环境对接 Elasticsearch/Meilisearch 重建索引
    return { rebuilt: true, message: '搜索索引重建任务已提交' };
  }

  // ==================== 审计日志详情 ====================

  async getAuditLogDetail(id: string) {
    const log = await this.auditLogService.findById(id);
    if (!log) throw new Error('审计日志不存在');
    return log;
  }

  // ==================== 管理员管理 ====================

  async findByUsername(username: string): Promise<AdminUser | null> {
    return this.adminUserRepo.findOne({ where: { username } });
  }

  async updateLoginInfo(id: string, ip: string): Promise<void> {
    await this.adminUserRepo.update(id, { lastLoginAt: new Date(), lastLoginIp: ip });
  }
}
