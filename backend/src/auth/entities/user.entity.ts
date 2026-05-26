import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ default: 'user' })
  role: 'admin' | 'user' | 'analyst';

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'telegram_chat_id', nullable: true })
  telegramChatId: string;

  @Column({ name: 'notification_email', default: true })
  notificationEmail: boolean;

  @Column({ name: 'notification_telegram', default: false })
  notificationTelegram: boolean;

  @Column({ name: 'notification_slack', default: false })
  notificationSlack: boolean;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamptz' })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
