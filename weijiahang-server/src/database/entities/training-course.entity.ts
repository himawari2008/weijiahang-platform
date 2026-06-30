import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('training_courses')
export class TrainingCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'video_url' })
  videoUrl: string;

  @Column({ type: 'int' })
  duration: number;

  @Column({ type: 'varchar', length: 30 })
  category: string;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
