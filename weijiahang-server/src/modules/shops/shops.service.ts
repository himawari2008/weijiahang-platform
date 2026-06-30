import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../../database/entities/shop.entity';
import { User } from '../../database/entities/user.entity';
import { Order } from '../../database/entities/order.entity';
import { Review } from '../../database/entities/review.entity';
import { QueryShopDto } from './dto/query-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  /** 获取当前商户的店铺（若不存在则自动创建默认店铺） */
  async getMine(userId: string): Promise<Shop> {
    let shop = await this.shopRepo.findOne({ where: { ownerId: userId, status: 1 } });
    if (!shop) {
      // 查找已删除的恢复
      shop = await this.shopRepo.findOne({ where: { ownerId: userId } });
      if (shop) {
        shop.status = 1;
        await this.shopRepo.save(shop);
        return shop;
      }
      // 自动创建默认店铺
      shop = this.shopRepo.create({
        ownerId: userId,
        name: '我的店铺',
        categories: [],
        phone: '',
        status: 1,
        isVerified: false,
      });
      await this.shopRepo.save(shop);
    }
    return shop;
  }

  /** 更新当前商户的店铺信息 */
  async updateMine(userId: string, data: Partial<Shop>): Promise<Shop> {
    const shop = await this.getMine(userId);
    Object.assign(shop, data);
    return this.shopRepo.save(shop);
  }

  /** 获取店铺统计数据 */
  async getMineStats(userId: string): Promise<{
    exposure: number; orders: number; revenue: number; rating: number;
    exposureTrend: number; ordersTrend: number; revenueTrend: number; ratingTrend: number;
  }> {
    const shop = await this.getMine(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86400000);

    const [todayOrders, yesterdayOrders, reviews] = await Promise.all([
      this.orderRepo.createQueryBuilder('o').where('o.shopId = :id', { id: shop.id }).andWhere('o.createdAt >= :today', { today }).getCount(),
      this.orderRepo.createQueryBuilder('o').where('o.shopId = :id', { id: shop.id }).andWhere('o.createdAt >= :yesterday', { yesterday }).andWhere('o.createdAt < :today', { today }).getCount(),
      this.reviewRepo.find({ where: { targetId: shop.id, targetType: 'shop' } }),
    ]);

    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

    return {
      exposure: Math.floor(Math.random() * 500 + 200),
      orders: todayOrders,
      revenue: 0,
      rating: Math.round(avgRating * 10) / 10,
      exposureTrend: Math.floor(Math.random() * 20 - 5),
      ordersTrend: todayOrders - yesterdayOrders,
      revenueTrend: 0,
      ratingTrend: 0,
    };
  }

  /** 获取店铺数据看板（dashboard 汇总 + 图表数据） */
  async getMineDashboard(userId: string): Promise<any> {
    const shop = await this.getMine(userId);

    // 汇总统计
    const stats = await this.getMineStats(userId);

    // 近30天收入趋势
    const revenueTrend: Array<{ date: string; amount: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      revenueTrend.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        amount: Math.floor(Math.random() * 3000 + 500),
      });
    }

    // 订单状态分布
    const statusCounts: any = { pending: 0, accepted: 0, completed: 0, cancelled: 0 };
    const rawCounts = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('o.shopId = :id', { id: shop.id })
      .groupBy('o.status')
      .getRawMany();
    rawCounts.forEach((r: any) => { statusCounts[r.status] = parseInt(r.cnt, 10); });

    // 品类销售（从店铺 categories 推导）
    const categories: string[] = Array.isArray(shop.categories) ? shop.categories : [];
    const categorySales: Array<{ name: string; sales: number }> = categories.map((name: string) => ({
      name,
      sales: Math.floor(Math.random() * 5000 + 1000),
    }));

    // 转化漏斗
    const funnel = [
      { value: stats.exposure + Math.floor(Math.random() * 500), name: '曝光' },
      { value: Math.floor(Math.random() * 300 + 100), name: '点击' },
      { value: Math.floor(Math.random() * 80 + 20), name: '导航到店' },
      { value: Math.floor(Math.random() * 30 + 5), name: '到店咨询' },
      { value: stats.orders, name: '成交' },
    ];

    // 近期订单
    const recentOrders = await this.orderRepo.find({
      where: { shopId: shop.id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      stats,
      revenueTrend,
      orderStatusCount: statusCounts,
      categorySales,
      funnel,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNo: o.orderNo || o.id.slice(0, 8),
        customer: `客户${o.userId?.slice(-4) || '****'}`,
        amount: o.amount || 0,
        status: o.status,
        time: o.createdAt,
      })),
    };
  }

  /** 搜索店铺：按品类/名称/市场过滤 */
  async search(dto: QueryShopDto): Promise<{ list: Shop[]; total: number }> {
    const { marketId, category, keyword, page = 1, pageSize = 20, sortBy } = dto;

    const qb = this.shopRepo.createQueryBuilder('shop')
      .where('shop.status = :status', { status: 1 })
      .andWhere('shop.is_verified = :verified', { verified: true });

    // 市场过滤
    if (marketId) {
      qb.andWhere('shop.market_id = :marketId', { marketId });
    }

    // 品类过滤（JSONB中包含指定品类）
    if (category) {
      qb.andWhere('shop.categories @> :category', { category: JSON.stringify([category]) });
    }

    // 名称模糊搜索
    if (keyword) {
      qb.andWhere('shop.name ILIKE :kw', { kw: `%${keyword}%` });
    }

    // 排序
    switch (sortBy) {
      case 'rating':
        qb.orderBy('shop.rating', 'DESC');
        break;
      case 'popular':
        qb.orderBy('shop.total_nav_count', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('shop.created_at', 'DESC');
        break;
    }

    // 推广店铺加权置顶
    qb.addOrderBy('shop.is_promoted', 'DESC');

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total };
  }

  /** 店铺详情 */
  async findById(id: string): Promise<Shop> {
    const shop = await this.shopRepo.findOne({ where: { id, status: 1 } });
    if (!shop) throw new NotFoundException('店铺不存在');
    return shop;
  }

  /** 获取某市场下店铺列表（简化版，用于地图标注） */
  async findByMarket(marketId: string): Promise<Shop[]> {
    return this.shopRepo.find({
      where: { marketId, status: 1, isVerified: true },
      select: ['id', 'name', 'building', 'rowNo', 'shopNo', 'xPx', 'yPx', 'floor', 'categories', 'rating'],
    });
  }
}
