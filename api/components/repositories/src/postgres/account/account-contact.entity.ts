import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ACCOUNT_CONTACT_TABLE_NAME, SocialType } from './account.types';
import { type Account } from './account.entity';

@Entity({ name: ACCOUNT_CONTACT_TABLE_NAME })
export class AccountContact {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Account', 'contacts', { nullable: false })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ type: 'simple-array' })
  wallets: string[];

  @Column({ type: 'boolean', default: false })
  favourited: boolean;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'simple-json', nullable: false, default: '{}' })
  socials: Record<SocialType, string>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
