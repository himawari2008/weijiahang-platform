import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Market } from './market.entity';

export enum ServiceType {
  NAVIGATION = 'navigation',
  ACCOMPANY = 'accompany',
  INSPECTION = 'inspection',
}

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  ARRIVED = 'arrived',
  PREPARING = 'preparing',    // 商户备货中
  READY = 'ready',            // 商户备货完成，等待领航员取货
  SERVING = 'serving',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ABNORMAL = 'abnormal',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, unique: true, name: 'order_no' })
  orderNo: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true, name: 'navigator_id' })
  navigatorId: string;

  @Column({ type: 'varchar', length: 20, name: 'service_type' })
  serviceType: ServiceType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', default: '[]', name: 'target_shops' })
  targetShops: any;

  @Column({ type: 'uuid', name: 'target_market_id' })
  targetMarketId: string;

  @ManyToOne(() => Market)
  @JoinColumn({ name: 'target_market_id' })
  targetMarket: Market;

  @Column({ type: 'simple-json', nullable: true, name: 'budget_range' })
  budgetRange: any;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'platform_fee' })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'navigator_income' })
  navigatorIncome: number;

  @Column({ type: 'datetime', nullable: true, name: 'expected_start' })
  expectedStart: Date;

  @Column({ type: 'datetime', nullable: true, name: 'actual_start' })
  actualStart: Date;

  @Column({ type: 'datetime', nullable: true, name: 'expected_end' })
  expectedEnd: Date;

  @Column({ type: 'datetime', nullable: true, name: 'actual_end' })
  actualEnd: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'cancel_reason' })
  cancelReason: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'cancel_by' })
  cancelBy: string;

  @Column({ type: 'boolean', default: false, name: 'user_confirmed' })
  userConfirmed: boolean;

  @Column({ type: 'simple-json', default: '{}', name: 'inspection_report' })
  inspectionReport: any;

  /** 商户ID（备货/取货相关） */
  @Column({ type: 'uuid', nullable: true, name: 'shop_id' })
  shopId: string;

  /** 备货完成数据（照片等） */
  @Column({ type: 'simple-json', default: '{}', name: 'fulfillment_data' })
  fulfillmentData: any;

  /** 转单原因 */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'transfer_reason' })
  transferReason: string | null;

  @Column({ type: 'smallint', default: 0, name: 'pay_status' })
  payStatus: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}

