import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 智能派单记录
 * 记录每次派单的匹配详情、领航员响应状态
 */
@Entity('dispatch_records')
export class DispatchRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联订单ID */
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  /** 领航员ID */
  @Column({ type: 'uuid', name: 'navigator_id' })
  navigatorId: string;

  /** 派单方式：broadcast-广播, assigned-指定, manual-手动 */
  @Column({ type: 'varchar', length: 20, name: 'dispatch_type' })
  dispatchType: string;

  /** 匹配得分 */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number | null;

  /** 匹配理由明细，如 ["距离近:30分","技能匹配:20分"] */
  @Column({ type: 'simple-json', default: '[]' })
  reasons: string[];

  /** 状态：pending-待响应, accepted-已接受, rejected-已拒绝, expired-已过期, assigned-已指派 */
  @Column({ type: 'varchar', length: 20 })
  status: string;

  /** 接单时间 */
  @Column({ type: 'datetime', nullable: true, name: 'accepted_at' })
  acceptedAt: Date | null;

  /** 过期时间 */
  @Column({ type: 'datetime', name: 'expired_at' })
  expiredAt: Date;

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
