import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { AdminUser } from './admin-user.entity';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true, name: 'config_key' })
  configKey: string;

  @Column({ type: 'simple-json', nullable: false, name: 'config_value' })
  configValue: object;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string;

  @ManyToOne(() => AdminUser)
  @JoinColumn({ name: 'updated_by' })
  updater: AdminUser;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
