import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  openid: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  unionid: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'real_name' })
  realName: string;

  /** 密码哈希（商户/管理员登录用） */
  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  password: string;

  /** 用户角色：customer | merchant | admin */
  @Column({ type: 'varchar', length: 20, default: 'customer' })
  role: string;

  /** 营业执照图片URL（商户认证用） */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'business_license_url' })
  businessLicenseUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string;

  @Column({ type: 'uuid', nullable: true, name: 'default_market_id' })
  defaultMarketId: string;

  @Column({ type: 'int', default: 0, name: 'total_orders' })
  totalOrders: number;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  /** Token版本号 — 强制登出时递增，旧token自动失效 */
  @Column({ type: 'int', default: 0, name: 'token_version' })
  tokenVersion: number;

  @Column({ type: 'datetime', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  /* ═══════════════════════════════════════════
     客户分层字段（Phase 1 — 核心交易链路改造）
     ═══════════════════════════════════════════ */

  /** 客户类型：retail(散客) | contractor(工长) | decoration_company(装企) | wholesale(批发) */
  @Column({ type: 'varchar', length: 30, default: 'retail', name: 'customer_type' })
  customerType: string;

  /** 客户类型中文标签（散客/工长/装企/批发） */
  @Column({ type: 'varchar', length: 30, default: '散客', name: 'customer_type_label' })
  customerTypeLabel: string;

  /** 累计积分余额 */
  @Column({ type: 'int', default: 0, name: 'total_points' })
  totalPoints: number;

  /** 累计消费金额 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_spent' })
  totalSpent: number;

  /** 推荐人ID（推荐返利用） */
  @Column({ type: 'uuid', nullable: true, name: 'referrer_id' })
  referrerId: string;

  /** 用户偏好设置（配送偏好/预算范围/偏好市场等） */
  @Column({ type: 'simple-json', default: '{}', name: 'preferences' })
  preferences: any;

  /** 引导进度（0=未开始，1=已选客群，2=已完成） */
  @Column({ type: 'smallint', default: 0, name: 'onboarding_step' })
  onboardingStep: number;

  /** 累计购买数量（批发客群等级计算用） */
  @Column({ type: 'int', default: 0, name: 'total_quantity' })
  totalQuantity: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
