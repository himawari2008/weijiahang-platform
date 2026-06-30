import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Market } from './market.entity';

@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 商户用户ID（关联 users 表） */
  @Column({ type: 'uuid', nullable: true, name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'uuid', nullable: true, name: 'market_id' })
  marketId: string;

  @ManyToOne(() => Market)
  @JoinColumn({ name: 'market_id' })
  market: Market;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  building: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'row_no' })
  rowNo: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'shop_no' })
  shopNo: string;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true, name: 'x_px' })
  xPx: number;

  @Column({ type: 'double precision', nullable: true, name: 'y_px' })
  yPx: number;

  @Column({ type: 'int', default: 1 })
  floor: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'shop_image' })
  shopImage: string;

  @Column({ type: 'simple-json', default: '[]', name: 'images' })
  images: any;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'business_license_url' })
  businessLicenseUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'license_no' })
  licenseNo: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'legal_person' })
  legalPerson: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'simple-json', default: '[]' })
  categories: any;

  @Column({ type: 'simple-json', default: '[]' })
  brands: any;

  @Column({ type: 'simple-json', nullable: true, name: 'price_range' })
  priceRange: any;

  @Column({ type: 'time', default: '09:00', name: 'biz_hours_start' })
  bizHoursStart: string;

  @Column({ type: 'time', default: '18:00', name: 'biz_hours_end' })
  bizHoursEnd: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  announcement: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ type: 'int', default: 0, name: 'review_count' })
  reviewCount: number;

  @Column({ type: 'int', default: 0, name: 'total_nav_count' })
  totalNavCount: number;

  @Column({ type: 'int', default: 0, name: 'favorite_count' })
  favoriteCount: number;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_promoted' })
  isPromoted: boolean;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}

