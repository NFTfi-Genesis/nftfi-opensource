import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { NotificationChannel } from './notification.types';

@Entity({ name: 'notifications' })
@Index(['key', 'template', 'recipient'], { unique: true })
@Index(['sent', 'channel', 'createdAt'])
@Index(['recipient', 'sent'])
export class Notification<T extends object = object> {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  key: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'boolean', default: false })
  sent: boolean;

  @Column({ type: 'varchar' })
  template: string;

  @Column({ type: 'varchar' })
  recipient: string;

  @Column({ type: 'simple-json' })
  context: T;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
