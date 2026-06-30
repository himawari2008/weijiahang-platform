import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserAddress } from './user-address.entity';
import { Navigator } from './navigator.entity';

/**
 * 商品采购订单实体
 *
 * 状态机：pending_merchant → merchant_confirmed → paid → preparing → shipped → received → completed
 *                                                              ↘ cancelled（取消）
 * 退款分支：completed → refunding → refunded
 *
 * 订单号前缀：WJHPD（区别于领航员服务订单 WJH）
 */
@Entity('product_orders')
export class ProductOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 订单编号（WJHPD + 日期 + 随机码） */
  @Column({ type: 'varchar', length: 32, unique: true, name: 'order_no' })
  orderNo: string;

  /* ═══ 用户信息 ═══ */

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** 下单时的客群类型快照 */
  @Column({ type: 'varchar', length: 30, default: 'retail', name: 'customer_type' })
  customerType: string;

  /** 下单时的客户等级快照 */
  @Column({ type: 'int', default: 1, name: 'tier_level' })
  tierLevel: number;

  /* ═══ 订单状态 ═══ */

  /**
   * 状态枚举：
   * pending_merchant   — 待商家确认
   * merchant_confirmed — 商家已确认（待付款）
   * paid               — 已付款
   * preparing          — 备货中
   * shipped            — 已发货
   * received           — 已收货
   * completed          — 已完成
   * cancelled          — 已取消
   * refunding          — 退款中
   * refunded           — 已退款
   */
  @Column({ type: 'varchar', length: 30, default: 'pending_merchant' })
  status: string;

  /* ═══ 配送信息 ═══ */

  /** 配送方式：self_pickup(自提) | navigator_deliver(领航员配送) | logistics(物流) */
  @Column({ type: 'varchar', length: 30, default: 'self_pickup', name: 'delivery_method' })
  deliveryMethod: string;

  /** 收件地址ID */
  @Column({ type: 'uuid', nullable: true, name: 'address_id' })
  addressId: string;

  @ManyToOne(() => UserAddress, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address: UserAddress;

  /** 地址快照（避免地址变更影响历史订单） */
  @Column({ type: 'simple-json', nullable: true, name: 'address_snapshot' })
  addressSnapshot: any;

  /** 领航员ID（领航员配送时使用） */
  @Column({ type: 'uuid', nullable: true, name: 'navigator_id' })
  navigatorId: string;

  @ManyToOne(() => Navigator, { nullable: true })
  @JoinColumn({ name: 'navigator_id' })
  navigator: Navigator;

  /** 配送费 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'delivery_fee' })
  deliveryFee: number;

  /** 预约日期 */
  @Column({ type: 'date', nullable: true, name: 'appointed_date' })
  appointedDate: Date;

  /** 预约时段（上午/下午/全天） */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'appointed_time_slot' })
  appointedTimeSlot: string;

  /* ═══ 价格明细 ═══ */

  /** 商品总价（原价 × 数量之和，优惠前） */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'items_total' })
  itemsTotal: number;

  /** 客群等级折扣金额 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'tier_discount' })
  tierDiscount: number;

  /** 优惠券ID */
  @Column({ type: 'uuid', nullable: true, name: 'coupon_id' })
  couponId: string;

  /** 优惠券抵扣金额 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'coupon_discount' })
  couponDiscount: number;

  /** 积分抵扣金额 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'points_discount' })
  pointsDiscount: number;

  /** 商家手动调价金额（正=加价，负=优惠） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'adjustment_amount' })
  adjustmentAmount: number;

  /** 最终应付金额 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'final_amount' })
  finalAmount: number;

  /* ═══ 支付信息 ═══ */

  /** 支付方式：wechat_pay | balance | credit（装企） */
  @Column({ type: 'varchar', length: 30, nullable: true, name: 'payment_method' })
  paymentMethod: string;

  /** 支付状态：0未付 1已付 2已退款 */
  @Column({ type: 'smallint', default: 0, name: 'pay_status' })
  payStatus: number;

  /** 支付时间 */
  @Column({ type: 'datetime', nullable: true, name: 'pay_time' })
  payTime: Date;

  /** 支付流水号 */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'pay_transaction' })
  payTransaction: string;

  /* ═══ 发票 ═══ */

  /** 是否需要发票 */
  @Column({ type: 'boolean', default: false, name: 'invoice_requested' })
  invoiceRequested: boolean;

  /** 发票抬头 */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'invoice_title' })
  invoiceTitle: string;

  /** 纳税人识别号 */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'invoice_tax_id' })
  invoiceTaxId: string;

  /* ═══ 来源 ═══ */

  /** 订单来源：miniapp | merchant | admin */
  @Column({ type: 'varchar', length: 20, default: 'miniapp' })
  source: string;

  /* ═══ 备注 ═══ */

  /** 用户备注 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  remark: string;

  /** 商家内部备注 */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'internal_note' })
  internalNote: string;

  /* ═══ 首单标记 ═══ */

  /** 是否为首单（用于首单优惠/新人券追踪） */
  @Column({ type: 'boolean', default: false, name: 'first_order' })
  firstOrder: boolean;

  /* ═══ 取消/退款 ═══ */

  /** 取消原因 */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'cancel_reason' })
  cancelReason: string;

  /** 取消操作人：user | merchant | system */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'cancel_by' })
  cancelBy: string;

  /** 取消时间 */
  @Column({ type: 'datetime', nullable: true, name: 'cancel_at' })
  cancelAt: Date;

  /** 退款原因 */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'refund_reason' })
  refundReason: string;

  /** 退款金额 */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'refund_amount' })
  refundAmount: number;

  /** 退款时间 */
  @Column({ type: 'datetime', nullable: true, name: 'refund_at' })
  refundAt: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
