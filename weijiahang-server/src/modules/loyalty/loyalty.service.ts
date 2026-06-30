import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointsLog } from '../../database/entities/points-log.entity';
import { ReferralRecord } from '../../database/entities/referral-record.entity';
import { User } from '../../database/entities/user.entity';

/**
 * 积分 & 推荐奖励引擎
 *
 * 规则：
 * - 消费 10 元 = 1 积分
 * - 100 积分 = 1 元抵扣
 * - 推荐人获得被推荐人首单金额 5% 等值积分
 */
@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(PointsLog)
    private readonly pointsLogRepo: Repository<PointsLog>,
    @InjectRepository(ReferralRecord)
    private readonly referralRepo: Repository<ReferralRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /* ═══════════════════════════════════════════
     积分管理
     ═══════════════════════════════════════════ */

  /** 获取积分 */
  async earnPoints(
    userId: string,
    amount: number,
    source: string,
    referenceId?: string,
  ): Promise<PointsLog> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // FIX: 使用原子递增，避免并发丢积分
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ totalPoints: () => `COALESCE(total_points, 0) + ${amount}` })
      .where('id = :id', { id: userId })
      .execute();

    // 重新读取最新值
    const updatedUser = await this.userRepo.findOne({ where: { id: userId } });

    const log = this.pointsLogRepo.create({
      userId, type: 'earn', amount, source,
      balanceAfter: updatedUser?.totalPoints || 0, referenceId,
    } as any);

    return this.pointsLogRepo.save(log as unknown as PointsLog);
  }

  /** 兑换积分（消费抵扣） */
  async redeemPoints(userId: string, amount: number, referenceId?: string): Promise<PointsLog> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    // FIX: 使用 NestJS BadRequestException 返回 400 而非 500
    if ((user.totalPoints || 0) < amount) throw new BadRequestException('积分不足');

    // FIX: 使用原子递减
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ totalPoints: () => `COALESCE(total_points, 0) - ${amount}` })
      .where('id = :id AND COALESCE(total_points, 0) >= :amount', { id: userId, amount })
      .execute();

    const updatedUser = await this.userRepo.findOne({ where: { id: userId } });

    const log = this.pointsLogRepo.create({
      userId, type: 'redeem', amount: -amount, source: 'order',
      balanceAfter: updatedUser?.totalPoints || 0, referenceId,
    } as any);

    return this.pointsLogRepo.save(log as unknown as PointsLog);
  }

  /** 积分余额 */
  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user?.totalPoints || 0;
  }

  /** 积分流水 */
  async getHistory(userId: string, page = 1, pageSize = 20): Promise<{ items: PointsLog[]; total: number }> {
    const [items, total] = await this.pointsLogRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /**
   * 下单完成后发放积分
   * 由 ProductOrderService 调用
   */
  async awardPointsForOrder(userId: string, orderAmount: number, orderId: string): Promise<void> {
    const points = Math.floor(orderAmount / 10); // 10元=1积分
    if (points > 0) {
      await this.earnPoints(userId, points, 'order', orderId);
    }
  }

  /* ═══════════════════════════════════════════
     推荐系统
     ═══════════════════════════════════════════ */

  /** 生成推荐码 */
  generateReferralCode(userId: string): string {
    const prefix = 'WJH';
    const suffix = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `${prefix}${suffix}`;
  }

  /** 创建推荐关系 */
  async createReferral(referrerId: string, refereeId: string): Promise<ReferralRecord> {
    // FIX: 使用 BadRequestException
    if (referrerId === refereeId) throw new BadRequestException('不能推荐自己');

    // 查重
    const existing = await this.referralRepo.findOne({ where: { refereeId } });
    if (existing) throw new BadRequestException('该用户已被推荐');

    // 校验推荐人存在
    const referrer = await this.userRepo.findOne({ where: { id: referrerId } });
    if (!referrer) throw new BadRequestException('推荐人不存在');

    const code = this.generateReferralCode(referrerId);

    // FIX: 先保存推荐记录，再发积分（防止积分先发但记录保存失败）
    const record = this.referralRepo.create({
      referrerId, refereeId, referralCode: code,
      referrerReward: 0, refereeReward: 0,
      status: 'pending',
    } as any);

    const savedRecord = await this.referralRepo.save(record as unknown as ReferralRecord);

    // 发放被推荐人奖励（100积分），引用推荐记录ID
    const newUserRewardPoints = 100;
    try {
      await this.earnPoints(refereeId, newUserRewardPoints, 'referral_bonus', savedRecord.id);
      // 更新奖励记录
      savedRecord.refereeReward = newUserRewardPoints;
      await this.referralRepo.save(savedRecord as unknown as ReferralRecord);
    } catch (e) {
      // 积分发放失败不阻塞推荐关系建立
      console.warn('[Loyalty] 推荐积分发放失败:', e.message);
    }

    return savedRecord;
  }

  /** 被推荐人完成首单后奖励推荐人 */
  async rewardReferrer(refereeId: string, orderId: string, orderAmount: number): Promise<void> {
    const record = await this.referralRepo.findOne({ where: { refereeId, status: 'pending' } });
    if (!record) return;

    // 推荐人获得首单金额5%的等值积分
    const rewardPoints = Math.floor(orderAmount * 0.05);
    if (rewardPoints > 0) {
      await this.earnPoints(record.referrerId, rewardPoints, 'referral_bonus', orderId);
    }

    record.referrerReward = rewardPoints;
    record.orderId = orderId;
    record.status = 'completed';
    await this.referralRepo.save(record as unknown as ReferralRecord);
  }

  /** 用户推荐记录 */
  async getReferralRecords(userId: string): Promise<ReferralRecord[]> {
    return this.referralRepo.find({
      where: { referrerId: userId },
      order: { createdAt: 'DESC' },
    });
  }
}
