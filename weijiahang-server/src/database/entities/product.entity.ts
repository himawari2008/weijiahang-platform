import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Shop } from './shop.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  spec: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 20, default: '㎡' })
  priceUnit: string;

  @Column({ type: 'simple-json', default: '[]' })
  images: any;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true, name: 'is_on_sale' })
  isOnSale: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  /* ═══════════════════════════════════════════
     产品分层 & 定价字段（Phase 1 — 核心交易链路改造）
     ═══════════════════════════════════════════ */

  /** 库存数量（-1 = 无限库存） */
  @Column({ type: 'int', default: -1 })
  stock: number;

  /** 成本价（商户内部参考，前端不展示） */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cost_price' })
  costPrice: number;

  /** 产品等级：budget(经济款) | standard(标准款) | premium(高端款) | custom(定制款) */
  @Column({ type: 'varchar', length: 20, default: 'standard', name: 'product_grade' })
  productGrade: string;

  /** 产品等级中文标签：经济款/标准款/高端款/定制款 */
  @Column({ type: 'varchar', length: 30, default: '标准款', name: 'grade_label' })
  gradeLabel: string;

  /** 按客群的专属定价（JSON）：{"contractor": 120, "wholesale": 105}，null=使用默认price */
  @Column({ type: 'simple-json', default: '{}', name: 'tier_prices' })
  tierPrices: any;

  /** 最小起订量 */
  @Column({ type: 'int', default: 1, name: 'min_order_qty' })
  minOrderQty: number;

  /** 累计销量 */
  @Column({ type: 'int', default: 0, name: 'sales_count' })
  salesCount: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
