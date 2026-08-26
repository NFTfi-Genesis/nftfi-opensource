import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'notification_subscriptions' })
@Index(['channelId'], { unique: true })
export class NotificationSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'channel_id' })
  channelId: string;

  @Column({ type: 'varchar', nullable: true })
  prefix?: string;

  @Column({ type: 'simple-array' })
  inputs: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
