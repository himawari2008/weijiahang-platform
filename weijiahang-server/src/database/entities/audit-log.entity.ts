import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * 审计日志实体
 * 记录所有状态变更操作，满足安全审计和合规要求
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 操作类型: CREATE | UPDATE | DELETE | LOGIN | LOGOUT */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  action: string;

  /** 目标实体: Order | Product | User | Navigator | Shop | Ad | ... */
  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  entity: string;

  /** 目标实体ID */
  @Column({ type: 'varchar', length: 64, nullable: true })
  entityId: string;

  /** 操作人ID */
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'operator_id' })
  operatorId: string;

  /** 操作人类型: user | navigator | shop | admin */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'operator_type' })
  operatorType: string;

  /** 请求方法 */
  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string;

  /** 请求路径 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string;

  /** 请求IP */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ip: string;

  /** 请求体（脱敏后，最多2000字符） */
  @Column({ type: 'text', nullable: true, name: 'request_body' })
  requestBody: string;

  /** HTTP 状态码 */
  @Column({ type: 'int', nullable: true, name: 'status_code' })
  statusCode: number;

  /** 操作结果: success | failure */
  @Column({ type: 'varchar', length: 10, default: 'success' })
  result: string;

  /** 错误信息 */
  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  /** 处理耗时（毫秒） */
  @Column({ type: 'int', nullable: true })
  duration: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
