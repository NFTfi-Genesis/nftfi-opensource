import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import * as transformers from '../transformers';
import { CollectionAsset } from '../collection-asset';
import { MARKET_LOAN_TABLE_NAME, MarketLoanProtocol, MarketLoanStatus } from './market-loan.types';

@Entity({ name: MARKET_LOAN_TABLE_NAME })
@Index(['contract', 'loanId'], { unique: true })
@Index(['status', 'protocol', 'dueAt'])
@Index(['status', 'borrower'])
@Index(['status', 'lender'])
export class MarketLoan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'numeric', name: 'loan_id' })
  loanId: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  contract: string;

  @Column({ type: 'enum', enum: MarketLoanProtocol })
  protocol: MarketLoanProtocol;

  @Column({ type: 'enum', enum: MarketLoanStatus })
  status: MarketLoanStatus;

  @ManyToOne(() => CollectionAsset, entity => entity.id, { nullable: false })
  @JoinColumn({ name: 'asset_id' })
  asset: CollectionAsset;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  borrower: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  lender: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  currency: string;

  @Column({ type: 'varchar', name: 'nft_contract', transformer: [transformers.toLowerCase] })
  nftContract: string;

  @Column({ type: 'numeric', name: 'nft_token_id', transformer: [transformers.toLowerCase] })
  nftTokenId: string;

  @Column({ type: 'numeric', default: '0' })
  principal: string; // wei amount

  @Column({ type: 'float', name: 'principal_usd', default: 0 })
  principalUsd: number; // usd amount

  @Column({ type: 'float', name: 'principal_eth', default: 0 })
  principalEth: number;

  @Column({ type: 'numeric', default: '0' })
  repayment: string; // wei amount

  @Column({ type: 'float', name: 'repayment_usd', default: 0 })
  repaymentUsd: number; // usd amount

  @Column({ type: 'float', name: 'repayment_eth', default: 0 })
  repaymentEth: number;

  @Column({ type: 'numeric', name: 'repayment_max', default: '0' })
  repaymentMax: string; // wei amount

  @Column({ type: 'float', name: 'repayment_max_usd', default: 0 })
  repaymentMaxUsd: number; // usd amount

  @Column({ type: 'float', name: 'repayment_max_eth', default: 0 })
  repaymentMaxEth: number;

  @Column({ type: 'numeric', default: '0' })
  interest: string; // wei amount

  @Column({ type: 'float', name: 'interest_usd', default: 0 })
  interestUsd: number; // usd amount

  @Column({ type: 'float', name: 'interest_eth', default: 0 })
  interestEth: number;

  @Column({ type: 'numeric', name: 'origination_fee', default: '0' })
  originationFee: string; // wei amount

  @Column({ type: 'float', name: 'origination_fee_usd', default: 0 })
  originationFeeUsd: number; // usd amount

  @Column({ type: 'float', name: 'origination_fee_eth', default: 0 })
  originationFeeEth: number;

  @Column({ type: 'numeric', name: 'admin_fee', default: '0' })
  adminFee: string; // wei amount

  @Column({ type: 'float', name: 'admin_fee_usd', default: 0 })
  adminFeeUsd: number; // usd amount

  @Column({ type: 'float', name: 'admin_fee_eth', default: 0 })
  adminFeeEth: number;

  @Column({ type: 'float' })
  apr: number;

  @Column({ type: 'float' })
  eapr: number;

  @Column({ type: 'integer' })
  duration: number; // in seconds

  @Column({ type: 'timestamp', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'varchar', name: 'started_tx' })
  startedTx: string;

  @Column({ type: 'timestamp', name: 'due_at', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'timestamp', name: 'ended_at', nullable: true })
  endedAt?: Date;

  @Column({ type: 'varchar', name: 'ended_tx', nullable: true })
  endedTx?: string;

  @Column({ type: 'boolean' })
  prorated: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
