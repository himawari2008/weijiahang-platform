import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Market } from './market.entity';

@Entity('navigators')
export class Navigator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  openid: string;

  @Column({ type: 'varchar', length: 20, name: 'real_name' })
  realName: string;

  @Column({ type: 'varchar', length: 64, name: 'id_card' })
  idCard: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'id_card_front' })
  idCardFront: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'id_card_back' })
  idCardBack: string;

  @Column({ type: 'boolean', default: false, name: 'face_verified' })
  faceVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'background_check' })
  backgroundCheck: boolean;

  @Column({ type: 'simple-json', default: '[]', name: 'home_markets' })
  homeMarkets: any;

  @Column({ type: 'simple-json', default: '[]' })
  skills: any;

  @Column({ type: 'int', default: 0, name: 'experience_years' })
  experienceYears: number;

  @Column({ type: 'boolean', default: false, name: 'is_online' })
  isOnline: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_busy' })
  isBusy: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'current_market_id' })
  currentMarketId: string;

  @Column({ type: 'double precision', nullable: true, name: 'last_latitude' })
  lastLatitude: number;

  @Column({ type: 'double precision', nullable: true, name: 'last_longitude' })
  lastLongitude: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ type: 'int', default: 0, name: 'total_orders' })
  totalOrders: number;

  @Column({ type: 'int', default: 0, name: 'complete_orders' })
  completeOrders: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_earned' })
  totalEarned: number;

  @Column({ type: 'smallint', default: 0 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}

