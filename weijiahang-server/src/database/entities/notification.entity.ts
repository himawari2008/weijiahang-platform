import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 通知/站内信
 * 支持用户、领航员、商户三种目标类型
 * 通知类型：新订单、订单状态变更、系统通知、等级变更、徽章获得、疲劳提醒、收益通知
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 目标用户ID（user/navigator/shop的ID） */
  @Index()
  @Column({ type: 'varchar', length: 64, name: 'target_id' })
  targetId: string;

  /** 目标类型：user-业主, navigator-领航员, shop-商户 */
  @Column({ type: 'varchar', length: 20, name: 'target_type' })
  targetType: string;

  /** 通知类型：order_new-新订单, order_status-订单状态变更, system-系统通知, tier_change-等级变更, badge_earned-徽章获得, fatigue-疲劳提醒, earning-收益通知 */
  @Column({ type: 'varchar', length: 30 })
  type: string;

  /** 通知标题 */
  @Column({ type: 'varchar', length: 200 })
  title: string;

  /** 通知正文 */
  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** 额外数据载荷（JSON） */
  @Column({ type: 'simple-json', default: '{}' })
  data: any;

  /** 是否已读（0-未读, 1-已读） */
  @Column({ type: 'smallint', default: 0, name: 'is_read' })
  isRead: number;

  /** 阅读时间 */
  @Column({ type: 'datetime', nullable: true, name: 'read_at' })
  readAt: Date | null;

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
