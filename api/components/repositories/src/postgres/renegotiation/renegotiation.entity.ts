import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { MarketLoan } from '../market-loan';
import * as transformers from '../transformers';
import { RENEGOTIATION_TABLE_NAME, RenegotiationParty, RenegotiationStatus } from './renegotiation.types';

@Entity({ name: RENEGOTIATION_TABLE_NAME })
@Index(['loan'])
@Index(['lender'])
@Index(['borrower'])
@Index(['status', 'expiresAt'])
export class Renegotiation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MarketLoan, { nullable: false })
  @JoinColumn({ name: 'loan_id' })
  loan: MarketLoan;

  @Column({ type: 'enum', enum: RenegotiationStatus })
  status: RenegotiationStatus;

  @Column({ type: 'enum', enum: RenegotiationParty })
  party: RenegotiationParty;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  borrower: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  lender: string;

  @Column({ type: 'varchar', name: 'lender_nonce', nullable: true })
  lenderNonce: string | null;

  @Column({ type: 'integer' })
  duration: number; // in seconds

  @Column({ type: 'numeric', name: 'renegotiation_fee', default: '0' })
  renegotiationFee: string; // wei amount

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  signature: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at' })
  deletedAt?: Date;

  @Column({ type: 'varchar', name: 'deleted_reason', nullable: true })
  deletedReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
