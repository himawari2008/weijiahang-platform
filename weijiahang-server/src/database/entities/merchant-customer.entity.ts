import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('merchant_customers')
export class MerchantCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'int', default: 0, name: 'total_orders' })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'datetime', nullable: true, name: 'last_order_at' })
  lastOrderAt: Date;

  @Column({ type: 'simple-json', default: '[]' })
  tags: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
