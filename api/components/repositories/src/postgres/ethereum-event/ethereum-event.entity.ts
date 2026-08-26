import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import * as transformers from '../transformers';

@Entity({ name: 'ethereum_events' })
@Index(['contract', 'name', 'blockNumber', 'logIndex'], { unique: true })
@Index(['contract', 'blockNumber'])
@Index(['tx'])
export class EthereumEvent<T extends object = object> {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', transformer: [transformers.toLowerCase] })
  contract: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int', name: 'block_number' })
  blockNumber: number;

  @Column({ type: 'int', name: 'log_index' })
  logIndex: number;

  @Column({ type: 'varchar', name: 'tx' })
  tx: string;

  @Column({ type: 'bool', default: false })
  played: boolean;

  @Column({ type: 'simple-json' })
  args: T;

  @Column({ type: 'timestamp', name: 'emitted_at' })
  emittedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
