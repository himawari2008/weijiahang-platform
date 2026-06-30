import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Market } from './market.entity';

@Entity('beacons')
@Unique(['marketId', 'beaconUid'])
export class Beacon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'market_id' })
  marketId: string;

  @ManyToOne(() => Market)
  @JoinColumn({ name: 'market_id' })
  market: Market;

  @Column({ type: 'varchar', length: 50, name: 'beacon_uid' })
  beaconUid: string;

  @Column({ type: 'int' })
  floor: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true, name: 'x_px' })
  xPx: number;

  @Column({ type: 'double precision', nullable: true, name: 'y_px' })
  yPx: number;

  @Column({ type: 'int', default: -59, name: 'tx_power' })
  txPower: number;

  @Column({ type: 'int', default: 100, name: 'battery_level' })
  batteryLevel: number;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'firmware_ver' })
  firmwareVer: string;

  @Column({ type: 'datetime', nullable: true, name: 'last_seen' })
  lastSeen: Date;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'installed_at' })
  installedAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
