import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('ai_chat_logs')
export class AiChatLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 64, name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', nullable: true, name: 'tokens_used' })
  tokensUsed: number;

  @Column({ type: 'varchar', length: 50, default: 'claude' })
  model: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: object;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
