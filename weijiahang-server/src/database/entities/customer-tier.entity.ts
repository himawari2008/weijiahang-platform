import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 客户等级记录表
 * 每个用户一条记录，记录当前等级和历史升降级信息
 * 参考 NavigatorTier 实体模式设计
 */
@Entity('customer_tiers')
export class CustomerTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 用户ID（唯一，一个用户一条等级记录） */
  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  /** 客户类型快照 */
  @Column({ type: 'varchar', length: 30, name: 'customer_type' })
  customerType: string;

  /** 当前等级 1-5 */
  @Column({ type: 'int', default: 1, name: 'current_level' })
  currentLevel: number;

  /** 当前等级名称：青铜/白银/黄金/铂金/钻石 */
  @Column({ type: 'varchar', length: 20, default: '青铜', name: 'current_tier_name' })
  currentTierName: string;

  /** 综合评分（加权计算） */
  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0, name: 'total_score' })
  totalScore: number;

  /** 累计消费金额 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_amount' })
  totalAmount: number;

  /** 累计订单数 */
  @Column({ type: 'int', default: 0, name: 'order_count' })
  orderCount: number;

  /** 累计采购数量 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_quantity' })
  totalQuantity: number;

  /** 当前等级享受的自动折扣率（如 0.05 = 5%） */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'tier_discount_rate' })
  tierDiscountRate: number;

  /** 月信用额度（装企专属，其余客群为null） */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'monthly_credit_limit' })
  monthlyCreditLimit: number | null;

  /** 距离下一级还需订单数 */
  @Column({ type: 'int', default: 0, name: 'orders_progress' })
  ordersProgress: number;

  /** 距离下一级还需消费金额 */
  @Column({ type: 'int', default: 0, name: 'amount_progress' })
  amountProgress: number;

  /** 距离下一级还需活跃月数 */
  @Column({ type: 'int', default: 0, name: 'months_progress' })
  monthsProgress: number;

  /** 升级时间 */
  @Column({ type: 'datetime', nullable: true, name: 'promoted_at' })
  promotedAt: Date;

  /** 降级时间 */
  @Column({ type: 'datetime', nullable: true, name: 'demoted_at' })
  demotedAt: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
