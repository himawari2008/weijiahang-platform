import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * 推荐记录
 * 推荐人获得被推荐人首单金额的5%等值积分
 */
@Entity('referral_records')
export class ReferralRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 推荐人ID */
  @Column({ type: 'uuid', name: 'referrer_id' })
  referrerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  /** 被推荐人ID */
  @Column({ type: 'uuid', name: 'referee_id' })
  refereeId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referee_id' })
  referee: User;

  /** 推荐码 */
  @Column({ type: 'varchar', length: 20, name: 'referral_code' })
  referralCode: string;

  /** 推荐人奖励积分 */
  @Column({ type: 'int', default: 0, name: 'referrer_reward' })
  referrerReward: number;

  /** 被推荐人奖励积分 */
  @Column({ type: 'int', default: 0, name: 'referee_reward' })
  refereeReward: number;

  /** 关联的订单ID（被推荐人首单） */
  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId: string;

  /** 状态：pending(待完成首单) / completed(已完成) / cancelled(取消) */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
