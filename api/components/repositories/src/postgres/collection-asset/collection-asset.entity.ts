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
import { Collection } from '../collection';
import * as transformers from '../transformers';
import { COLLECTION_ASSET_TABLE_NAME } from './collection-asset.types';

@Entity({ name: COLLECTION_ASSET_TABLE_NAME })
@Index(['contract', 'tokenId'], { unique: true })
export class CollectionAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  contract: string;

  @Column({ type: 'numeric', name: 'token_id' })
  tokenId: string;

  @Column({ type: 'varchar', default: '' })
  name: string;

  @Column({ type: 'varchar', name: 'image_small_url', nullable: true })
  imageSmallUrl: string | null;

  @Column({ type: 'varchar', name: 'image_medium_url', nullable: true })
  imageMediumUrl: string | null;

  @ManyToOne(() => Collection, collection => collection.id, { nullable: false })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
