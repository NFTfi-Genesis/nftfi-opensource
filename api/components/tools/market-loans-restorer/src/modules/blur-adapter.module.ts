import { Module } from '@nestjs/common';
import { BlurLoanService, BlurLoanSubscriber } from '@nftfi.api/services/loans/subscribers/blur';

@Module({
  providers: [BlurLoanService, BlurLoanSubscriber]
})
export class BlurAdapterModule {}
