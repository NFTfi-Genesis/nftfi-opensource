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
import { Collection } from '../collection/collection.entity';

@Entity({ name: 'collection_floor_prices' })
@Index(['collection', 'createdAt'], { unique: true })
export class CollectionFloorPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Collection, collection => collection.id, { nullable: false, eager: true })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection;

  @Column({ type: 'float', name: 'value_eth' })
  valueEth: number;

  @Column({ type: 'float', name: 'value_usd' })
  valueUsd: number;

  @CreateDateColumn({ name: 'created_at', type: 'date' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
