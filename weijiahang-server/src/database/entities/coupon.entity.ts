import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 优惠券定义
 * 复用 MarketingActivity 的 rule JSON 模式
 */
@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  /** 券类型：new_user(新人券) / full_reduction(满减) / category(品类) / cash(现金) / shipping_free(免邮) */
  @Column({ type: 'varchar', length: 30, default: 'full_reduction' })
  type: string;

  /** 优惠值（金额或百分比数值） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  /** 折扣类型：amount(固定金额) / percentage(百分比) */
  @Column({ type: 'varchar', length: 10, default: 'amount', name: 'discount_type' })
  discountType: string;

  /** 最大折扣金额（百分比券的封顶） */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_discount' })
  maxDiscount: number;

  /** 最低消费门槛 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'min_amount' })
  minAmount: number;

  /** 使用范围：global(全场) / shop(指定店铺) / category(指定品类) / product(指定商品) */
  @Column({ type: 'varchar', length: 30, default: 'global', name: 'usage_scope' })
  usageScope: string;

  /** 范围值（shopId / category / productId） */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'scope_value' })
  scopeValue: string;

  /** 有效期起 */
  @Column({ type: 'date', name: 'valid_from' })
  validFrom: Date;

  /** 有效期止 */
  @Column({ type: 'date', name: 'valid_to' })
  validTo: Date;

  /** 适用星期（JSON数组，["mon","tue"...]，空=全周） */
  @Column({ type: 'simple-json', default: '[]', name: 'applicable_days' })
  applicableDays: string[];

  /** 发行总量（0=无限） */
  @Column({ type: 'int', default: 0, name: 'total_count' })
  totalCount: number;

  /** 已领取数量 */
  @Column({ type: 'int', default: 0, name: 'used_count' })
  usedCount: number;

  /** 每人限领 */
  @Column({ type: 'int', default: 1, name: 'per_user_limit' })
  perUserLimit: number;

  /** 状态：1启用 0停用 -1删除 */
  @Column({ type: 'smallint', default: 1 })
  status: number;

  /** 平台补贴标记（true=平台承担优惠成本） */
  @Column({ type: 'boolean', default: false, name: 'platform_subsidized' })
  platformSubsidized: boolean;

  /** 扩展规则（JSON，复用 MarketingActivity 模式） */
  @Column({ type: 'simple-json', default: '{}' })
  rule: any;

  /** 创建人（管理员ID） */
  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string;

  /** 店铺ID（null=平台券） */
  @Column({ type: 'uuid', nullable: true, name: 'shop_id' })
  shopId: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
