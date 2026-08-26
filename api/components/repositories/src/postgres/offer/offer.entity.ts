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
import { Collection } from '../collection';
import * as transformers from '../transformers';
import { OFFER_TABLE_NAME, OfferType } from './offer.types';

@Entity({ name: OFFER_TABLE_NAME })
@Index(['lender', 'lenderNonce'], { unique: true })
@Index(['lender', 'expiresAt'])
@Index(['borrower'])
@Index(['collection'])
@Index(['nftContract', 'nftTokenIdFrom'])
@Index(['expiresAt'])
export class Offer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: OfferType })
  type: OfferType;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  borrower: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  lender: string;

  @Column({ type: 'varchar', name: 'lender_nonce' })
  lenderNonce: string;

  @Column({ type: 'varchar', name: 'nft_contract', transformer: [transformers.toLowerCase] })
  nftContract: string;

  @Column({ type: 'numeric', name: 'nft_token_id_from' })
  nftTokenIdFrom: string;

  @Column({ type: 'numeric', name: 'nft_token_id_to' })
  nftTokenIdTo: string;

  @ManyToOne(() => Collection, collection => collection.id, { nullable: false })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  currency: string;

  @Column({ type: 'numeric', default: '0' })
  principal: string; // wei amount

  @Column({ type: 'numeric', name: 'repayment_max', default: '0' })
  repaymentMax: string; // wei amount

  @Column({ type: 'numeric', name: 'origination_fee', default: '0' })
  originationFee: string; // wei amount

  @Column({ type: 'float' })
  apr: number;

  @Column({ type: 'float' })
  eapr: number;

  @Column({ type: 'integer' })
  duration: number; // in seconds

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  prorated: boolean;

  @Column({ type: 'text', nullable: true })
  signature: string | null;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at' })
  deletedAt?: Date;

  @Column({ type: 'varchar', name: 'deleted_reason', nullable: true })
  deletedReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
