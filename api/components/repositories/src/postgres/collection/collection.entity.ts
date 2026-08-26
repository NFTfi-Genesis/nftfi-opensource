import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import * as transformers from '../transformers';
import { COLLECTION_TABLE_NAME, TokenStandard } from './collection.types';

@Entity({ name: COLLECTION_TABLE_NAME })
@Index(['contract', 'tokenRangeBegin', 'tokenRangeEnd'], { unique: true })
export class Collection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  contract: string;

  @Column({ type: 'numeric', name: 'token_range_begin' })
  tokenRangeBegin: string;

  @Column({ type: 'numeric', name: 'token_range_end' })
  tokenRangeEnd: string;

  @Column({ type: 'enum', enum: TokenStandard, name: 'token_standard' })
  tokenStandard: TokenStandard;

  @Column({ type: 'int' })
  ranking: number;

  @Column({ type: 'bool' })
  whitelisted: boolean;

  @Column({ type: 'varchar', name: 'npf_slug', nullable: true })
  npfSlug: string | null;

  @Column({ type: 'varchar', name: 'opensea_slug', nullable: true })
  openseaSlug?: string;

  @Column({ type: 'varchar', name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ type: 'date', name: 'released_at' })
  releasedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  get tokenRange(): [string, string] {
    return [this.tokenRangeBegin, this.tokenRangeEnd];
  }

  set tokenRange([begin, end]: [string, string]) {
    this.tokenRangeBegin = begin;
    this.tokenRangeEnd = end;
  }
}
