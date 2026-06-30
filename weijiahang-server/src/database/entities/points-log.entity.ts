import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * 积分流水记录
 * 消费10元=1积分，100积分=1元抵扣
 */
@Entity('points_logs')
export class PointsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** earn(获取) / redeem(兑换) / expire(过期) / referral_bonus(推荐奖励) */
  @Column({ type: 'varchar', length: 20 })
  type: string;

  /** 变动点数（正=获取，负=消耗） */
  @Column({ type: 'int' })
  amount: number;

  /** 变动后余额 */
  @Column({ type: 'int', name: 'balance_after' })
  balanceAfter: number;

  /** 来源：order / referral / review / signin / manual */
  @Column({ type: 'varchar', length: 20 })
  source: string;

  /** 关联业务ID（订单号/推荐记录ID等） */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'reference_id' })
  referenceId: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
