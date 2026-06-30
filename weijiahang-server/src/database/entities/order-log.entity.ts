import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Order } from './order.entity';

export enum OrderLogAction {
  CREATED = 'created',
  ACCEPTED = 'accepted',
  ARRIVED = 'arrived',
  SERVING = 'serving',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ABNORMAL = 'abnormal',
}

export enum OrderLogOperatorType {
  USER = 'user',
  NAVIGATOR = 'navigator',
  SYSTEM = 'system',
}

@Entity('order_logs')
@Index(['orderId', 'createdAt'])
export class OrderLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 50 })
  action: OrderLogAction;

  @Column({ type: 'varchar', length: 20, name: 'operator_type' })
  operatorType: OrderLogOperatorType;

  @Column({ type: 'uuid', nullable: true, name: 'operator_id' })
  operatorId: string;

  @Column({ type: 'simple-json', default: '{}' })
  detail: Record<string, any>;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
