import { Global, Module } from '@nestjs/common';
import { BlurLoanSubscriber } from './blur-loan.subscriber';
import { BlurLoanService } from './blur-loan.service';
import { BlurLoanScheduler } from './blur-loan.scheduler';

@Global()
@Module({
  providers: [BlurLoanSubscriber, BlurLoanService, BlurLoanScheduler],
  exports: [BlurLoanService]
})
export class BlurLoanModule {}
