import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import * as transformers from '../transformers';

@Entity({ name: 'fx_rates' })
@Index(['symbol', 'createdAt'], { unique: true })
export class FxRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  symbol: string;

  @Column({ type: 'float' })
  rate: number;

  @Column({ type: 'timestamp', name: 'created_at', transformer: transformers.toDate })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
