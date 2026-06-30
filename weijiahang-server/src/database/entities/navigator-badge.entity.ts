import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('navigator_badges')
export class NavigatorBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'navigator_id' })
  navigatorId: string;

  @Column({ type: 'varchar', length: 30, name: 'badge_key' })
  badgeKey: string;

  @Column({ type: 'varchar', length: 50, name: 'badge_name' })
  badgeName: string;

  @Column({ type: 'varchar', length: 50, name: 'badge_icon' })
  badgeIcon: string;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'smallint', default: 0, name: 'is_earned' })
  isEarned: number;

  @Column({ type: 'datetime', nullable: true, name: 'earned_at' })
  earnedAt: Date;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'int', default: 1, name: 'max_progress' })
  maxProgress: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
