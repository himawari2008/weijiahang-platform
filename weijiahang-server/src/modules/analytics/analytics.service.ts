import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { User } from '../../database/entities/user.entity';
import { Shop } from '../../database/entities/shop.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { Market } from '../../database/entities/market.entity';
import { Beacon } from '../../database/entities/beacon.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(Navigator)
    private readonly navRepo: Repository<Navigator>,
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,
    @InjectRepository(Beacon)
    private readonly beaconRepo: Repository<Beacon>,
  ) {}

  // Get full shop analytics
  async getShopAnalytics(
    shopId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    overview: {
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
      completedOrders: number;
      cancelledOrders: number;
    };
    traffic: {
      totalVisits: number;
      uniqueCustomers: number;
      conversionRate: number;
    };
    sales: {
      dailySales: { date: string; amount: number; count: number }[];
      categoryDistribution: { category: string; count: number; amount: number }[];
    };
    trends: {
      ordersTrend: number;
      revenueTrend: number;
    };
  }> {
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Overview
    const totalOrders = await this.orderRepo.count({ where: { shopId } });
    const completedOrders = await this.orderRepo.count({ where: { shopId, status: OrderStatus.COMPLETED } });
    const cancelledOrders = await this.orderRepo.count({ where: { shopId, status: OrderStatus.CANCELLED } });

    const revenueResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.amount), 0)', 'total')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne<{ total: number }>();
    const totalRevenue = Number(revenueResult?.total || 0);

    // Period comparison for trends
    const periodLen = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodLen);

    const periodOrders = await this.orderRepo.count({
      where: { shopId, createdAt: Between(startDate, endDate) as any },
    });
    const prevPeriodOrders = await this.orderRepo.count({
      where: { shopId, createdAt: Between(prevStart, startDate) as any },
    });

    const periodRevenueResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.amount), 0)', 'total')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne<{ total: number }>();
    const prevRevenueResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.amount), 0)', 'total')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: prevStart, end: startDate })
      .getRawOne<{ total: number }>();

    const periodRevenue = Number(periodRevenueResult?.total || 0);
    const prevRevenue = Number(prevRevenueResult?.total || 0);

    const ordersTrend = prevPeriodOrders > 0 ? Math.round(((periodOrders - prevPeriodOrders) / prevPeriodOrders) * 100) : 0;
    const revenueTrend = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    // Daily sales
    const dailyOrders = await this.orderRepo
      .createQueryBuilder('order')
      .select("DATE(order.createdAt) as date, COUNT(*) as count, COALESCE(SUM(order.amount), 0) as amount")
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('DATE(order.createdAt)', 'ASC')
      .getRawMany();

    const dailySales = (dailyOrders || []).map((d: any) => ({
      date: d.date,
      count: Number(d.count),
      amount: Number(d.amount || 0),
    }));

    return {
      overview: {
        totalOrders,
        totalRevenue,
        avgOrderValue: completedOrders > 0 ? Math.round(totalRevenue / completedOrders * 100) / 100 : 0,
        completedOrders,
        cancelledOrders,
      },
      traffic: {
        totalVisits: totalOrders,
        uniqueCustomers: await this.orderRepo
          .createQueryBuilder('order')
          .select('COUNT(DISTINCT order.userId)', 'count')
          .where('order.shopId = :shopId', { shopId })
          .getRawOne<{ count: number }>().then(r => Number(r?.count || 0)),
        conversionRate: 0, // Requires page view data
      },
      sales: {
        dailySales,
        categoryDistribution: [], // Requires product category data
      },
      trends: {
        ordersTrend,
        revenueTrend,
      },
    };
  }

  // Get navigator analytics
  async getNavigatorAnalytics(navId: string): Promise<{
    overview: {
      totalOrders: number;
      completedOrders: number;
      totalEarned: number;
      avgRating: number;
      acceptanceRate: number;
    };
    monthlyStats: { month: string; orders: number; income: number }[];
    peakHours: { hour: number; count: number }[];
    performance: {
      avgCompletionTime: number;
      onTimeRate: number;
    };
  }> {
    const nav = await this.navRepo.findOne({ where: { id: navId } });
    if (!nav) throw new NotFoundException('领航员不存在');

    const totalOrders = await this.orderRepo.count({ where: { navigatorId: navId } });
    const completedOrders = await this.orderRepo.count({ where: { navigatorId: navId, status: OrderStatus.COMPLETED } });
    const cancelledOrders = await this.orderRepo.count({ where: { navigatorId: navId, status: OrderStatus.CANCELLED } });

    // Monthly stats
    const monthlyData = await this.orderRepo
      .createQueryBuilder('order')
      .select("strftime('%Y-%m', order.createdAt) as month, COUNT(*) as orders, COALESCE(SUM(order.navigatorIncome), 0) as income")
      .where('order.navigatorId = :navId', { navId })
      .andWhere('order.status = :status', { status: 'completed' })
      .groupBy("strftime('%Y-%m', order.createdAt)")
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    const monthlyStats = (monthlyData || []).map((m: any) => ({
      month: m.month,
      orders: Number(m.orders),
      income: Number(m.income || 0),
    }));

    // Peak hours
    const completedOrdersData = await this.orderRepo
      .createQueryBuilder('order')
      .select("CAST(strftime('%H', order.createdAt) AS INTEGER) as hour, COUNT(*) as count")
      .where('order.navigatorId = :navId', { navId })
      .andWhere('order.status = :status', { status: 'completed' })
      .groupBy("strftime('%H', order.createdAt)")
      .orderBy('count', 'DESC')
      .getRawMany();

    const peakHours = (completedOrdersData || []).map((h: any) => ({
      hour: Number(h.hour),
      count: Number(h.count),
    }));

    return {
      overview: {
        totalOrders,
        completedOrders,
        totalEarned: nav.totalEarned || 0,
        avgRating: nav.rating || 0,
        acceptanceRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      },
      monthlyStats,
      peakHours,
      performance: {
        avgCompletionTime: 0, // Requires actual time tracking
        onTimeRate: 0,
      },
    };
  }

  /** 管理员：市场大盘分析 */
  async getMarketAnalytics(days: number = 30): Promise<{
    markets: Array<{
      name: string;
      shopCount: number;
      navigatorCount: number;
      orderCount: number;
      revenue: number;
      growth: number;
      conversionRate: number;
      avgRating: number;
      beaconCount: number;
    }>;
    trend: Array<{ date: string; orders: number; revenue: number }>;
    summary: { totalMarkets: number; totalShops: number; totalRevenue: number; avgGrowth: number };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const markets = await this.marketRepo.find({ where: { status: 1 } });
    const marketData: any[] = [];

    for (const market of markets) {
      const shops = await this.shopRepo.count({ where: { marketId: market.id, status: 1 } });
      const navs = await this.navRepo.count({ where: { homeMarketIds: market.id, status: 1 } } as any);
      const beacons = await this.beaconRepo.count({ where: { marketId: market.id, status: 1 } });

      const orderResult = await this.orderRepo
        .createQueryBuilder('order')
        .select('COUNT(order.id)', 'count')
        .addSelect('COALESCE(SUM(order.platformFee), 0)', 'revenue')
        .where('order.createdAt >= :start', { start: startDate })
        .getRawOne<{ count: number; revenue: number }>();

      marketData.push({
        name: market.name,
        shopCount: shops,
        navigatorCount: navs,
        orderCount: Number(orderResult?.count || 0),
        revenue: Number(orderResult?.revenue || 0),
        growth: 0, // 需要上期对比数据
        conversionRate: shops > 0 ? Math.round((Number(orderResult?.count || 0) / shops) * 100) : 0,
        avgRating: 4.5, // 需要评价数据
        beaconCount: beacons,
      });
    }

    // 聚合趋势
    const trendRaw = await this.orderRepo
      .createQueryBuilder('order')
      .select("DATE(order.createdAt) as date, COUNT(*) as orders, COALESCE(SUM(order.platformFee), 0) as revenue")
      .where('order.createdAt >= :start', { start: startDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('DATE(order.createdAt)', 'ASC')
      .getRawMany();

    const trend = (trendRaw || []).map((r: any) => ({
      date: r.date,
      orders: Number(r.orders),
      revenue: Number(r.revenue || 0),
    }));

    const totalRevenue = marketData.reduce((sum, m) => sum + m.revenue, 0);
    const avgGrowth = marketData.length > 0
      ? Math.round(marketData.reduce((sum, m) => sum + m.growth, 0) / marketData.length)
      : 0;

    return {
      markets: marketData,
      trend,
      summary: {
        totalMarkets: markets.length,
        totalShops: marketData.reduce((s, m) => s + m.shopCount, 0),
        totalRevenue,
        avgGrowth,
      },
    };
  }

  // Get platform-wide stats
  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalNavigators: number;
    totalShops: number;
    totalOrders: number;
    totalRevenue: number;
    todayStats: {
      newUsers: number;
      newOrders: number;
      revenue: number;
      activeNavigators: number;
    };
    growthRate: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [totalUsers, totalNavigators, totalShops, totalOrders, revenueResult,
      newUsers, newOrders, todayRevenue, activeNavigators] = await Promise.all([
      this.userRepo.count(),
      this.navRepo.count({ where: { status: 1 } }),
      this.shopRepo.count({ where: { status: 1 } }),
      this.orderRepo.count(),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.platformFee), 0)', 'total')
        .where('order.status = :status', { status: 'completed' })
        .getRawOne<{ total: number }>(),
      this.userRepo.count({ where: { createdAt: { $gte: todayStart } } as any }),
      this.orderRepo.count({ where: { createdAt: { $gte: todayStart } } as any }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.platformFee), 0)', 'total')
        .where('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt >= :today', { today: todayStart })
        .getRawOne<{ total: number }>(),
      this.navRepo.count({ where: { isOnline: true, status: 1 } }),
    ]);

    // Calculate growth rate
    const yesterdayNewUsers = await this.userRepo.count({
      where: { createdAt: Between(yesterdayStart, todayStart) as any },
    });

    return {
      totalUsers,
      totalNavigators,
      totalShops,
      totalOrders,
      totalRevenue: Number(revenueResult?.total || 0),
      todayStats: {
        newUsers,
        newOrders,
        revenue: Number(todayRevenue?.total || 0),
        activeNavigators,
      },
      growthRate: yesterdayNewUsers > 0 ? Math.round(((newUsers - yesterdayNewUsers) / yesterdayNewUsers) * 100) : 0,
    };
  }
}
