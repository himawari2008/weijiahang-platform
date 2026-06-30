import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Shop } from './shop.entity';

export enum AdType {
  CPC = 'cpc',
  CPM = 'cpm',
  MONTHLY = 'monthly',
}

@Entity('ads')
@Index(['shopId'])
@Index(['adPosition', 'status'])
@Index(['startDate', 'endDate'])
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Shop)
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ type: 'varchar', length: 20, name: 'ad_type' })
  adType: AdType;

  @Column({ type: 'varchar', length: 30, name: 'ad_position' })
  adPosition: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'daily_budget' })
  dailyBudget: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'cpc_bid' })
  cpcBid: number;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  spent: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
