import { Global, Module } from '@nestjs/common';
import { GondiLoanV1Subscriber } from './loan-v1';
import { GondiLoanV2Subscriber } from './loan-v2';
import { GondiLoanV3Subscriber } from './loan-v3';
import { GondiLoanV31Subscriber } from './loan-v31';
import { GondiLoanService } from './gondi-loan.service';
import { GondiLoanScheduler } from './gondi-loan.scheduler';

@Global()
@Module({
  providers: [
    GondiLoanV1Subscriber,
    GondiLoanV2Subscriber,
    GondiLoanV3Subscriber,
    GondiLoanV31Subscriber,
    GondiLoanService,
    GondiLoanScheduler
  ],
  exports: [GondiLoanService]
})
export class GondiLoanModule {}
