import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import * as transformers from '../transformers';
import { ACCOUNT_TABLE_NAME, CommsFrequency, SocialType } from './account.types';
import { AccountContact } from './account-contact.entity';

@Entity({ name: ACCOUNT_TABLE_NAME })
@Index(['wallet'], { unique: true })
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  wallet: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @OneToMany(() => AccountContact, contact => contact.account, { onDelete: 'CASCADE' })
  contacts: AccountContact[];

  @Column({ type: 'simple-json', nullable: false, default: '{}' })
  comms: Record<'refi' | 'maturity' | 'liquidity', CommsFrequency>;

  @Column({ type: 'simple-json', nullable: false, default: '{}' })
  socials: Record<Exclude<SocialType, SocialType.Email>, string>;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'text', name: 'signed_message', nullable: true })
  signedMessage: string | null;

  @Column({ type: 'timestamp', name: 'last_signed_at', nullable: true })
  lastSignedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
