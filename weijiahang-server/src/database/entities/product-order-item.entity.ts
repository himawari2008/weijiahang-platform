import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProductOrder } from './product-order.entity';
import { Product } from './product.entity';
import { Shop } from './shop.entity';

/**
 * 采购订单明细（商品行项目）
 * 下单时锁定价格快照，后续价格变动不影响已有订单
 */
@Entity('product_order_items')
export class ProductOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 所属订单 */
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => ProductOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: ProductOrder;

  /* ═══ 商品快照（下单时锁定，后续修改商品不影响历史订单） ═══ */

  /** 商品ID */
  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /** 店铺ID */
  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Shop)
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  /** 商品名称快照 */
  @Column({ type: 'varchar', length: 200, name: 'product_name' })
  productName: string;

  /** 商品规格快照 */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'product_spec' })
  productSpec: string;

  /** 产品等级快照 */
  @Column({ type: 'varchar', length: 20, default: 'standard', name: 'product_grade' })
  productGrade: string;

  /** 商品主图快照 */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'product_image' })
  productImage: string;

  /** 计价单位 */
  @Column({ type: 'varchar', length: 20, default: '㎡', name: 'price_unit' })
  priceUnit: string;

  /* ═══ 价格明细 ═══ */

  /** 商品原价（下单时快照） */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  /** 客群专属价（下单时计算） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'customer_price' })
  customerPrice: number;

  /** 采购数量 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  /** 小计（原价×数量） */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  /** 该行等级折扣金额 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'tier_discount_amount' })
  tierDiscountAmount: number;

  /** 该行最终金额（小计 - 等级折扣） */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'row_total' })
  rowTotal: number;

  /** 行备注 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  remark: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
