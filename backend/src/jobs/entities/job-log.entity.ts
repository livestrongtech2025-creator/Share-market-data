import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('job_logs')
export class JobLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'job_name' })
  jobName: string;

  @Column({ name: 'job_type' })
  jobType: string;

  @Index()
  @Column({ default: 'started' })
  status: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'duration_ms', type: 'bigint', nullable: true })
  durationMs: number;

  @Column({ name: 'records_processed', default: 0 })
  recordsProcessed: number;

  @Column({ name: 'records_inserted', default: 0 })
  recordsInserted: number;

  @Column({ name: 'records_failed', default: 0 })
  recordsFailed: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
