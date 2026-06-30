import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 领航员在线记录
 * 用于疲劳监测：记录每次上/下线时间、累计在线时长、是否被强制下线
 */
@Entity('navigator_online_records')
export class NavigatorOnlineRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 领航员ID */
  @Index()
  @Column({ type: 'uuid', name: 'navigator_id' })
  navigatorId: string;

  /** 上线时间 */
  @Column({ type: 'datetime', name: 'online_at' })
  onlineAt: Date;

  /** 下线时间 */
  @Column({ type: 'datetime', nullable: true, name: 'offline_at' })
  offlineAt: Date | null;

  /** 本次在线总时长（分钟） */
  @Column({ type: 'int', default: 0, name: 'total_minutes' })
  totalMinutes: number;

  /** 是否被强制下线（0-正常下线, 1-强制下线） */
  @Column({ type: 'smallint', default: 0, name: 'is_forced_offline' })
  isForcedOffline: number;

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
