import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  NftfiLoanCoordinator,
  NftfiLoanV1FixedSubscriber,
  NftfiLoanV2FixedSubscriber,
  NftfiLoanV2FixedCollectionSubscriber,
  NftfiLoanV21FixedSubscriber,
  NftfiLoanV23FixedSubscriber,
  NftfiLoanV23FixedCollectionSubscriber,
  NftfiLoanV23RefinanceSubscriber,
  NftfiLoanV3RefinanceSubscriber,
  NftfiLoanV31RefinanceSubscriber,
  NftfiLoanV3AssetSubscriber,
  NftfiLoanV3CollectionSubscriber,
  NftfiLoanService
} from '@nftfi.api/services/loans/subscribers/nftfi';
import { NftfiSmartNftId, NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';

@Module({
  imports: [TypeOrmModule.forFeature([NftfiSmartNftId])],
  providers: [
    NftfiSmartNftIdRepository,
    NftfiLoanCoordinator,
    NftfiLoanService,
    NftfiLoanV1FixedSubscriber,
    NftfiLoanV2FixedCollectionSubscriber,
    NftfiLoanV2FixedSubscriber,
    NftfiLoanV21FixedSubscriber,
    NftfiLoanV23FixedCollectionSubscriber,
    NftfiLoanV23FixedSubscriber,
    NftfiLoanV23RefinanceSubscriber,
    NftfiLoanV3RefinanceSubscriber,
    NftfiLoanV31RefinanceSubscriber,
    NftfiLoanV3CollectionSubscriber,
    NftfiLoanV3AssetSubscriber
  ]
})
export class NftfiLoanModule {}
