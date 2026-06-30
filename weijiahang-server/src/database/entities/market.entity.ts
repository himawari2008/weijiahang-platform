import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('markets')
export class Market {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  city: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 300 })
  address: string;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'floor_plan_url' })
  floorPlanUrl: string;

  @Column({ type: 'simple-json', default: '[]' })
  floors: any;

  @Column({ type: 'int', nullable: true, name: 'area_sqm' })
  areaSqm: number;

  @Column({ type: 'int', default: 0, name: 'shop_count' })
  shopCount: number;

  @Column({ type: 'int', default: 0, name: 'beacon_count' })
  beaconCount: number;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}

