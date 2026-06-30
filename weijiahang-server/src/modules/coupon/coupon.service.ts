import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Coupon } from '../../database/entities/coupon.entity';
import { UserCoupon } from '../../database/entities/user-coupon.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepo: Repository<UserCoupon>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /* ═══════════════════════════════════════════
     优惠券管理（Admin）
     ═══════════════════════════════════════════ */

  async create(dto: Partial<Coupon>): Promise<Coupon> {
    const coupon = this.couponRepo.create(dto as any);
    return this.couponRepo.save(coupon as unknown as Coupon);
  }

  async findAll(page = 1, pageSize = 20): Promise<{ items: Coupon[]; total: number }> {
    const [items, total] = await this.couponRepo.findAndCount({
      where: { status: 1 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async findById(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('优惠券不存在');
    return coupon;
  }

  async update(id: string, dto: Partial<Coupon>): Promise<Coupon> {
    await this.couponRepo.update(id, dto as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.couponRepo.update(id, { status: -1 } as any);
  }

  /* ═══════════════════════════════════════════
     用户端
     ═══════════════════════════════════════════ */

  /** 用户优惠券列表 */
  async getUserCoupons(userId: string, status?: string): Promise<UserCoupon[]> {
    const where: any = { userId };
    if (status) where.status = status;
    return this.userCouponRepo.find({ where, relations: ['coupon'], order: { assignedAt: 'DESC' } });
  }

  /** 可用优惠券（用于下单时选择） */
  async getAvailableForOrder(userId: string, orderAmount: number): Promise<Coupon[]> {
    // FIX: 使用时区安全的日期比较（使用本地日期而非UTC）
    const localNow = new Date();
    const todayStart = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());

    // 已持有的可用券
    const userCoupons = await this.userCouponRepo.find({
      where: { userId, status: 'unused' },
      relations: ['coupon'],
    });

    return userCoupons
      .map(uc => uc.coupon)
      .filter(c =>
        c &&
        c.status === 1 &&
        new Date(c.validFrom) <= todayStart &&
        new Date(c.validTo) >= todayStart &&
        Number(c.minAmount) <= orderAmount,
      );
  }

  /** 领取优惠券 */
  async claimCoupon(userId: string, couponId: string): Promise<UserCoupon> {
    const coupon = await this.findById(couponId);
    if (coupon.status !== 1) throw new BadRequestException('该优惠券已停用');

    // FIX: 使用时区安全的日期比较
    const localNow = new Date();
    const todayStart = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
    if (new Date(coupon.validFrom) > todayStart || new Date(coupon.validTo) < todayStart) {
      throw new BadRequestException('不在有效期');
    }

    // FIX: 原子递增 usedCount，防止超发（UPDATE ... SET used_count = used_count + 1 WHERE ... AND used_count < total_count）
    if (coupon.totalCount > 0) {
      const updateResult = await this.couponRepo
        .createQueryBuilder()
        .update(Coupon)
        .set({ usedCount: () => 'used_count + 1' })
        .where('id = :id AND used_count < total_count', { id: couponId })
        .execute();

      if (updateResult.affected === 0) {
        throw new BadRequestException('已抢光');
      }
    } else {
      // 不限量券，直接递增
      coupon.usedCount += 1;
      await this.couponRepo.save(coupon as unknown as Coupon);
    }

    // 每人限领
    const existing = await this.userCouponRepo.count({ where: { userId, couponId } });
    if (existing >= coupon.perUserLimit) {
      throw new BadRequestException('已达领取上限');
    }

    // FIX: 先保存 userCoupon，确保不丢券
    const userCoupon = this.userCouponRepo.create({ userId, couponId, status: 'unused' } as any);
    return this.userCouponRepo.save(userCoupon as unknown as UserCoupon);
  }

  /** 新人自动发券 */
  async autoAssignNewUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // 查找所有新人券
    const newUserCoupons = await this.couponRepo.find({
      where: { type: 'new_user', status: 1 },
    });

    for (const coupon of newUserCoupons) {
      try {
        await this.claimCoupon(userId, coupon.id);
        console.log(`[Coupon] 新人券已发放: ${coupon.name} → user:${userId}`);
      } catch (e) {
        // 单张券发放失败不阻塞
        console.warn(`[Coupon] 新人券发放失败: ${coupon.name}`, e.message);
      }
    }
  }

  /** 使用优惠券（下单时锁定） */
  async applyCoupon(userCouponId: string, orderId: string): Promise<void> {
    await this.userCouponRepo.update(userCouponId, {
      status: 'used',
      usedAt: new Date(),
      orderId,
    } as any);
  }

  /** 释放优惠券（订单取消时） */
  async releaseCoupon(orderId: string): Promise<void> {
    await this.userCouponRepo.update(
      { orderId, status: 'used' },
      { status: 'unused', usedAt: null, orderId: null } as any,
    );
  }

  /** 计算优惠券折扣 */
  calculateDiscount(coupon: Coupon, orderAmount: number): number {
    if (coupon.discountType === 'percentage') {
      const discount = orderAmount * (Number(coupon.value) / 100);
      if (coupon.maxDiscount) return Math.min(discount, Number(coupon.maxDiscount));
      return discount;
    }
    return Number(coupon.value);
  }
}
