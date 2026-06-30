import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('settlement_records')
export class SettlementRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'navigator_id' })
  navigatorId: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'platform_commission' })
  platformCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'navigator_income' })
  navigatorIncome: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'tier_discount' })
  tierDiscount: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'datetime', nullable: true, name: 'credited_at' })
  creditedAt: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
