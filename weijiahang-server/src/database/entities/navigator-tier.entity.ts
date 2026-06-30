import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('navigator_tiers')
export class NavigatorTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'navigator_id', unique: true })
  navigatorId: string;

  @Column({ type: 'int', default: 1, name: 'current_level' })
  currentLevel: number;

  @Column({ type: 'varchar', length: 20, default: '青铜', name: 'current_tier_name' })
  currentTierName: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0, name: 'total_score' })
  totalScore: number;

  @Column({ type: 'int', default: 0, name: 'orders_progress' })
  ordersProgress: number;

  @Column({ type: 'int', default: 0, name: 'rating_progress' })
  ratingProgress: number;

  @Column({ type: 'int', default: 0, name: 'exp_progress' })
  expProgress: number;

  @Column({ type: 'datetime', nullable: true, name: 'promoted_at' })
  promotedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'demoted_at' })
  demotedAt: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
