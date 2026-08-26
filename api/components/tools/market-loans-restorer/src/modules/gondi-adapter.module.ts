import { Module } from '@nestjs/common';
import {
  GondiLoanService,
  GondiLoanV1Subscriber,
  GondiLoanV2Subscriber,
  GondiLoanV31Subscriber,
  GondiLoanV3Subscriber
} from '@nftfi.api/services/loans/subscribers/gondi';

@Module({
  providers: [
    GondiLoanService,
    GondiLoanV1Subscriber,
    GondiLoanV2Subscriber,
    GondiLoanV3Subscriber,
    GondiLoanV31Subscriber
  ]
})
export class GondiAdapterModule {}
