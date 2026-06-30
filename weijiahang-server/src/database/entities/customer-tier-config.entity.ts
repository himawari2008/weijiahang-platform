import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 客户等级阈值配置表
 * 分客群 × 等级的阈值定义，支持运营动态调整
 *
 * 等级折扣率：青铜0% / 白银2% / 黄金5% / 铂金8% / 钻石12%
 */
@Entity('customer_tier_configs')
export class CustomerTierConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 客户类型：retail | contractor | decoration_company | wholesale */
  @Column({ type: 'varchar', length: 30, name: 'customer_type' })
  customerType: string;

  /** 等级 1-5 */
  @Column({ type: 'int' })
  level: number;

  /** 等级名称 */
  @Column({ type: 'varchar', length: 20, name: 'tier_name', default: '青铜' })
  tierName: string;

  /** 最低订单数 */
  @Column({ type: 'int', default: 0, name: 'min_order_count' })
  minOrderCount: number;

  /** 最低消费金额 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'min_total_amount' })
  minTotalAmount: number;

  /** 最低活跃月数 */
  @Column({ type: 'int', default: 0, name: 'min_months_active' })
  minMonthsActive: number;

  /** 最低采购数量（批发客群专用） */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'min_quantity' })
  minQuantity: number;

  /** 折扣率（如 0.05 = 5% off） */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'discount_rate' })
  discountRate: number;

  /** 月信用额度（装企专属，null表示不适用） */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'monthly_credit_limit' })
  monthlyCreditLimit: number | null;

  /** 配送优先级（数字越大越优先派单） */
  @Column({ type: 'smallint', default: 0, name: 'delivery_priority' })
  deliveryPriority: number;

  /** 是否启用 */
  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
