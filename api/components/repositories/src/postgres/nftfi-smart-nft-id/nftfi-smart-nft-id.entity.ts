import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { MarketLoan } from '../market-loan';
import { NFTFI_SMART_NFT_IDS_TABLE_NAME } from './nftfi-smart-nft-id.types';

@Entity({ name: NFTFI_SMART_NFT_IDS_TABLE_NAME })
@Unique(['loan'])
export class NftfiSmartNftId {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'numeric', name: 'smart_nft_id' })
  smartNftId: string;

  @ManyToOne(() => MarketLoan, { nullable: false })
  @JoinColumn({ name: 'market_loan_id' })
  loan: MarketLoan;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
