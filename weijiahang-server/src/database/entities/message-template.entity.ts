import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 消息话术模板
 * 按触发事件 → 分客群文案 → 填充模板变量 → 推送通知
 */
@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 模板编码：order_confirmed / delivery_update / after_sales_checkin / welcome_new_user / tier_upgrade */
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  /** 模板名称 */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** 触发事件标识 */
  @Column({ type: 'varchar', length: 50, name: 'trigger_event' })
  triggerEvent: string;

  /** 目标类型：user / navigator / shop */
  @Column({ type: 'varchar', length: 20, default: 'user', name: 'target_type' })
  targetType: string;

  /* ═══ 分客群文案 ═══ */

  /** 散客文案 */
  @Column({ type: 'text', nullable: true, name: 'body_retail' })
  bodyRetail: string;

  /** 工长文案 */
  @Column({ type: 'text', nullable: true, name: 'body_contractor' })
  bodyContractor: string;

  /** 装企文案 */
  @Column({ type: 'text', nullable: true, name: 'body_decoration' })
  bodyDecoration: string;

  /** 批发客群文案 */
  @Column({ type: 'text', nullable: true, name: 'body_wholesale' })
  bodyWholesale: string;

  /** 通用文案（无客群匹配时使用） */
  @Column({ type: 'text', nullable: true, name: 'body_default' })
  bodyDefault: string;

  /* ═══ 配置 ═══ */

  /** 模板变量列表（JSON） */
  @Column({ type: 'simple-json', default: '[]', name: 'template_vars' })
  templateVars: string[];

  /** 推送渠道：notification / sms / wechat_template */
  @Column({ type: 'simple-json', default: '["notification"]' })
  channels: string[];

  /** 微信模板消息ID */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'wechat_template_id' })
  wechatTemplateId: string;

  /** 是否启用 */
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
