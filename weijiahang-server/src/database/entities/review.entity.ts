import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', name: 'reviewer_id' })
  reviewerId: string;

  @Column({ type: 'varchar', length: 20, name: 'target_type' })
  targetType: string; // 'shop' | 'navigator'

  @Column({ type: 'uuid', name: 'target_id' })
  targetId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'smallint', nullable: true, name: 'quality_rating' })
  qualityRating: number;

  @Column({ type: 'smallint', nullable: true, name: 'price_rating' })
  priceRating: number;

  @Column({ type: 'smallint', nullable: true, name: 'service_rating' })
  serviceRating: number;

  @Column({ type: 'simple-json', default: '[]' })
  tags: any;

  @Column({ type: 'varchar', length: 500, nullable: true })
  content: string;

  @Column({ type: 'simple-json', default: '[]' })
  images: any;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reply: string;

  @Column({ type: 'datetime', nullable: true, name: 'replied_at' })
  repliedAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_anonymous' })
  isAnonymous: boolean;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}

