import { Module } from '@nestjs/common';
import {
  ArcadeLoanService,
  ArcadeLoanV2Subscriber,
  ArcadeLoanV3Subscriber
} from '@nftfi.api/services/loans/subscribers/arcade';

@Module({
  providers: [ArcadeLoanService, ArcadeLoanV2Subscriber, ArcadeLoanV3Subscriber]
})
export class ArcadeAdapterModule {}
