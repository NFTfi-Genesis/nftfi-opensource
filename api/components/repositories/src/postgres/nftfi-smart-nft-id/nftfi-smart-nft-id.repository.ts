import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketLoan } from '../market-loan';
import { NftfiSmartNftId } from './nftfi-smart-nft-id.entity';

@Injectable()
export class NftfiSmartNftIdRepository {
  constructor(@InjectRepository(NftfiSmartNftId) private readonly model: Repository<NftfiSmartNftId>) {}

  async create(loan: MarketLoan, smartNftId: string): Promise<void> {
    await this.model.upsert(
      { loan: { id: loan.id } as MarketLoan, smartNftId },
      {
        conflictPaths: ['loan'],
        skipUpdateIfNoValuesChanged: true
      }
    );
  }

  async findBySmartNftId(smartNftId: string): Promise<NftfiSmartNftId | null> {
    return this.model.findOne({ where: { smartNftId }, relations: ['loan'] });
  }
}
