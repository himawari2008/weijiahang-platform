import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DispatchRecord } from '../../database/entities/dispatch-record.entity';
import { Order } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { OrdersGateway } from '../orders/orders.gateway';

/** 匹配结果项 */
export interface MatchResult {
  navigatorId: string;
  score: number;
  reasons: string[];
}

/** 最佳匹配返回 */
export interface BestMatchResult {
  matches: MatchResult[];
  totalCandidates: number;
}

/**
 * 智能派单引擎
 * 根据距离、技能、评分、经验、负载等多维度计算领航员匹配得分
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(DispatchRecord)
    private readonly dispatchRepo: Repository<DispatchRecord>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Navigator)
    private readonly navigatorRepo: Repository<Navigator>,

    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * 主入口：对指定订单执行智能派单
   * 1. 检查订单状态和重复派单
   * 2. 计算最佳匹配
   * 3. 创建派单记录
   * 4. 广播通知
   */
  async dispatchOrder(
    orderId: string,
    marketId: string,
    categories?: string[],
  ): Promise<DispatchRecord[]> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');

    // 检查是否已派单
    const existingPending = await this.dispatchRepo.count({
      where: { orderId, status: 'pending' },
    });
    if (existingPending > 0) {
      throw new BadRequestException('该订单已有待响应的派单记录，请勿重复派单');
    }

    // 查找最佳匹配
    const bestMatches = await this.findBestMatch(marketId, { categories: categories || [] });

    // 创建派单记录
    const records: DispatchRecord[] = [];
    for (const match of bestMatches.matches) {
      const record = this.dispatchRepo.create({
        orderId,
        navigatorId: match.navigatorId,
        dispatchType: 'broadcast',
        score: match.score,
        reasons: match.reasons,
        status: 'pending',
        expiredAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟过期
      } as any);

      const saved = await this.dispatchRepo.save(record as unknown as DispatchRecord);
      records.push(saved);
    }

    // 通过WebSocket广播给市场内领航员
    this.broadcastToMarket(marketId, {
      orderId,
      orderNo: order.orderNo,
      serviceType: order.serviceType,
      dispatchRecords: records.map((r) => ({
        id: r.id,
        score: r.score,
        expiredAt: r.expiredAt,
      })),
    });

    this.logger.log(`订单 ${order.orderNo} 已向 ${records.length} 位领航员派单`);
    return records;
  }

  /**
   * 核心匹配算法：计算领航员与订单的匹配得分
   */
  async findBestMatch(
    marketId: string,
    orderDetails: { categories?: string[] },
  ): Promise<BestMatchResult> {
    // 查找市场内在线的空闲领航员
    const onlineNavigators = await this.navigatorRepo.find({
      where: {
        isOnline: true,
        isBusy: false,
        status: 1,
        currentMarketId: marketId,
      },
    });

    if (onlineNavigators.length === 0) {
      return { matches: [], totalCandidates: 0 };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 批量获取所有候选领航员的今日接单数和近30分钟拒单数（减少SQL查询次数）
    const navigatorIds = onlineNavigators.map((n) => n.id);

    const todayAcceptedCounts = await this.dispatchRepo
      .createQueryBuilder('dr')
      .select('dr.navigator_id', 'navigatorId')
      .addSelect('COUNT(dr.id)', 'cnt')
      .where('dr.navigator_id IN (:...ids)', { ids: navigatorIds })
      .andWhere('dr.status = :status', { status: 'accepted' })
      .andWhere('dr.accepted_at >= :todayStart', { todayStart })
      .groupBy('dr.navigator_id')
      .getRawMany();

    const recentRejectCounts = await this.dispatchRepo
      .createQueryBuilder('dr')
      .select('dr.navigator_id', 'navigatorId')
      .addSelect('COUNT(dr.id)', 'cnt')
      .where('dr.navigator_id IN (:...ids)', { ids: navigatorIds })
      .andWhere('dr.status = :status', { status: 'rejected' })
      .andWhere('dr.created_at >= :thirtyMinAgo', { thirtyMinAgo })
      .groupBy('dr.navigator_id')
      .getRawMany();

    const activeOrderCounts = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.navigator_id', 'navigatorId')
      .addSelect('COUNT(o.id)', 'cnt')
      .where('o.navigator_id IN (:...ids)', { ids: navigatorIds })
      .andWhere('o.target_market_id = :marketId', { marketId })
      .andWhere('o.status IN (:...statuses)', {
        statuses: ['accepted', 'arrived', 'serving'],
      })
      .groupBy('o.navigator_id')
      .getRawMany();

    // 构建查询结果映射
    const acceptedMap = new Map<string, number>();
    for (const row of todayAcceptedCounts) {
      acceptedMap.set(row.navigatorId, parseInt(row.cnt, 10));
    }
    const rejectMap = new Map<string, number>();
    for (const row of recentRejectCounts) {
      rejectMap.set(row.navigatorId, parseInt(row.cnt, 10));
    }
    const activeMap = new Map<string, number>();
    for (const row of activeOrderCounts) {
      activeMap.set(row.navigatorId, parseInt(row.cnt, 10));
    }

    const orderCategories = orderDetails.categories || [];

    const matches: MatchResult[] = onlineNavigators.map((nav) => {
      const reasons: string[] = [];
      let totalScore = 0;

      // 1. 距离得分 (0-30分)
      const isInMarket = nav.currentMarketId === marketId;
      const distanceScore = isInMarket ? 30 : 15;
      totalScore += distanceScore;
      reasons.push(`距离匹配:${distanceScore}分`);

      // 2. 技能匹配得分 (0-30分，每匹配一个品类+10)
      const navSkills: string[] = nav.skills || [];
      let skillScore = 0;
      for (const cat of orderCategories) {
        if (navSkills.includes(cat)) {
          skillScore += 10;
        }
      }
      skillScore = Math.min(30, skillScore);
      totalScore += skillScore;
      reasons.push(`技能匹配:${skillScore}分`);

      // 3. 评分得分 (0-20分)
      const ratingScore = (Number(nav.rating) / 5.0) * 20;
      totalScore += ratingScore;
      reasons.push(`评分:${ratingScore.toFixed(1)}分`);

      // 4. 经验得分 (0-10分)
      const experienceScore = Math.min(10, (nav.experienceYears || 0) * 2);
      totalScore += experienceScore;
      reasons.push(`经验:${experienceScore}分`);

      // 5. 负载得分 (0-10分，每接1单-2)
      const todayCount = acceptedMap.get(nav.id) || 0;
      const loadScore = Math.max(0, 10 - todayCount * 2);
      totalScore += loadScore;
      reasons.push(`负载:${loadScore}分`);

      // 6. 拒单惩罚（近30分钟拒单>2次，-10分）
      const recentRejects = rejectMap.get(nav.id) || 0;
      if (recentRejects > 2) {
        totalScore -= 10;
        reasons.push('拒单惩罚:-10分');
      }

      // 7. 顺路单奖励（在同一市场有进行中的订单，+15分）
      const activeCount = activeMap.get(nav.id) || 0;
      if (activeCount > 0) {
        totalScore += 15;
        reasons.push('顺路单奖励:+15分');
      }

      return {
        navigatorId: nav.id,
        score: Math.round(totalScore * 100) / 100,
        reasons,
      };
    });

    // 按得分降序排列，取前5名
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 5);

    return { matches: topMatches, totalCandidates: onlineNavigators.length };
  }

  /**
   * 广播派单通知到市场内所有在线领航员
   */
  broadcastToMarket(marketId: string, dispatchData: any): void {
    this.ordersGateway.notifyNewOrder(dispatchData, marketId);
    this.logger.log(`已广播派单通知到市场 ${marketId}`);
  }

  /**
   * 领航员接受派单
   */
  async acceptOrder(dispatchId: string, navigatorId: string): Promise<DispatchRecord> {
    const record = await this.dispatchRepo.findOne({
      where: { id: dispatchId, navigatorId },
    });
    if (!record) throw new NotFoundException('派单记录不存在');
    if (record.status !== 'pending') {
      throw new BadRequestException('该派单已被处理，无法接单');
    }

    // 更新派单记录
    record.status = 'accepted';
    record.acceptedAt = new Date();
    await this.dispatchRepo.save(record as unknown as DispatchRecord);

    // 拒绝同一订单的其他待处理派单（当前记录已更新为 accepted，不会被波及）
    await this.dispatchRepo.update(
      {
        orderId: record.orderId,
        status: 'pending',
      },
      { status: 'expired' },
    );

    // 更新订单：分配领航员
    const order = await this.orderRepo.findOne({ where: { id: record.orderId } });
    if (order) {
      order.navigatorId = navigatorId;
      order.status = 'accepted' as any;
      await this.orderRepo.save(order as unknown as Order);
    }

    this.logger.log(`领航员 ${navigatorId} 接受了派单 ${dispatchId}`);
    return record;
  }

  /**
   * 领航员拒绝派单
   */
  async rejectOrder(dispatchId: string, navigatorId: string): Promise<DispatchRecord> {
    const record = await this.dispatchRepo.findOne({
      where: { id: dispatchId, navigatorId },
    });
    if (!record) throw new NotFoundException('派单记录不存在');
    if (record.status !== 'pending') {
      throw new BadRequestException('该派单已被处理');
    }

    record.status = 'rejected';
    await this.dispatchRepo.save(record as unknown as DispatchRecord);

    // 检查是否所有派单都被拒绝，如果是则标记订单为待重新派单
    const pendingCount = await this.dispatchRepo.count({
      where: { orderId: record.orderId, status: 'pending' },
    });
    if (pendingCount === 0) {
      this.logger.warn(`订单 ${record.orderId} 所有派单均被拒绝，需重新派单`);
    }

    this.logger.log(`领航员 ${navigatorId} 拒绝了派单 ${dispatchId}`);
    return record;
  }

  /**
   * 获取领航员的待处理派单
   */
  async getPendingDispatches(navigatorId: string): Promise<DispatchRecord[]> {
    return this.dispatchRepo.find({
      where: { navigatorId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 查询派单记录
   */
  async queryRecords(orderId?: string): Promise<DispatchRecord[]> {
    const where: any = {};
    if (orderId) where.orderId = orderId;
    return this.dispatchRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
