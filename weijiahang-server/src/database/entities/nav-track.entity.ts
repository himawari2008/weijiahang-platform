import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Navigator } from './navigator.entity';

@Entity('nav_tracks')
@Index(['latitude', 'longitude'], { spatial: true })
export class NavTrack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', name: 'navigator_id' })
  navigatorId: string;

  @ManyToOne(() => Navigator)
  @JoinColumn({ name: 'navigator_id' })
  navigator: Navigator;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  speed: number;

  @Column({ type: 'double precision', nullable: true })
  accuracy: number;

  @Column({ type: 'int', nullable: true })
  floor: number;

  @Column({ type: 'simple-json', default: '[]', name: 'beacon_data' })
  beaconData: object;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
