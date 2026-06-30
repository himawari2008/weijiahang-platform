import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('training_progress')
export class TrainingProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'navigator_id' })
  navigatorId: string;

  @Column({ type: 'uuid', name: 'course_id' })
  courseId: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'smallint', default: 0 })
  completed: number;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'exam_score' })
  examScore: number;

  @Column({ type: 'smallint', default: 0, name: 'exam_passed' })
  examPassed: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
