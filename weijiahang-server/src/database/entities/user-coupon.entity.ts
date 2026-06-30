import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Coupon } from './coupon.entity';
import { ProductOrder } from './product-order.entity';

/**
 * 用户优惠券领取/使用记录
 */
@Entity('user_coupons')
export class UserCoupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'coupon_id' })
  couponId: string;

  @ManyToOne(() => Coupon)
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  /** 领取时间 */
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'assigned_at' })
  assignedAt: Date;

  /** 使用时间 */
  @Column({ type: 'datetime', nullable: true, name: 'used_at' })
  usedAt: Date;

  /** 使用的订单ID */
  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId: string;

  @ManyToOne(() => ProductOrder, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: ProductOrder;

  /** 状态：unused(未用) / used(已用) / expired(过期) */
  @Column({ type: 'varchar', length: 20, default: 'unused' })
  status: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
