import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('merchant_withdraw_records')
export class MerchantWithdraw {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  method: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'account_info' })
  accountInfo: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'datetime', name: 'applied_at' })
  appliedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
