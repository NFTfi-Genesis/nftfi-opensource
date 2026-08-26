import { Module } from '@nestjs/common';
import { NftfiLoanCoordinator } from './nftfi-loan-coordinator';
import { NftfiLoanService } from './nftfi-loan.service';
import { NftfiLoanV1FixedSubscriber } from './loan-v1-fixed';
import { NftfiLoanV2FixedSubscriber } from './loan-v2-fixed';
import { NftfiLoanV2FixedCollectionSubscriber } from './loan-v2-fixed-collection';
import { NftfiLoanV21FixedSubscriber } from './loan-v2-1-fixed';
import { NftfiLoanV23FixedSubscriber } from './loan-v2-3-fixed';
import { NftfiLoanV23FixedCollectionSubscriber } from './loan-v2-3-fixed-collection';
import { NftfiLoanV3RefinanceSubscriber } from './loan-v3-refinance';
import { NftfiLoanV31RefinanceSubscriber } from './loan-v31-refinance';
import { NftfiLoanV3AssetSubscriber } from './loan-v3-asset';
import { NftfiLoanV3CollectionSubscriber } from './loan-v3-collection';
import { NftfiLoanScheduler } from './nftfi-loan.scheduler';
import { NftfiLoanV23RefinanceSubscriber } from './loan-v2-3-refinance';

@Module({
  providers: [
    NftfiLoanCoordinator,
    NftfiLoanScheduler,
    NftfiLoanService,
    NftfiLoanV1FixedSubscriber,
    NftfiLoanV2FixedSubscriber,
    NftfiLoanV2FixedCollectionSubscriber,
    NftfiLoanV21FixedSubscriber,
    NftfiLoanV23RefinanceSubscriber,
    NftfiLoanV23FixedSubscriber,
    NftfiLoanV23FixedCollectionSubscriber,
    NftfiLoanV3RefinanceSubscriber,
    NftfiLoanV31RefinanceSubscriber,
    NftfiLoanV3AssetSubscriber,
    NftfiLoanV3CollectionSubscriber
  ]
})
export class NftfiLoanModule {}
