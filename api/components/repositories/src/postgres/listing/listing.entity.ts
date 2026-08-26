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
import * as transformers from '../transformers';
import { CollectionAsset } from '../collection-asset';
import { LISTING_TABLE_NAME, ListingPreference } from './listing.types';

@Entity({ name: LISTING_TABLE_NAME })
@Index(['nftContract', 'nftTokenId'], { unique: true, where: '"deleted_at" IS NULL' })
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'nft_contract', transformer: [transformers.toLowerCase] })
  nftContract: string;

  @Column({ type: 'numeric', name: 'nft_token_id' })
  nftTokenId: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  borrower: string;

  @Column({ type: 'varchar', nullable: true, transformer: [transformers.toLowerCase] })
  currency: string | null;

  @Column({ type: 'integer' })
  duration: number;

  @Column({ type: 'boolean', nullable: true })
  prorated: boolean | null;

  @Column({ type: 'enum', enum: ListingPreference, default: ListingPreference.LowApr })
  preference: ListingPreference;

  @ManyToOne(() => CollectionAsset, entity => entity.id, { nullable: false })
  @JoinColumn({ name: 'asset_id' })
  asset: CollectionAsset;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ type: 'varchar', name: 'deleted_reason', nullable: true })
  deletedReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
