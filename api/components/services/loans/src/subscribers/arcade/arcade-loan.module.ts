import { Global, Module } from '@nestjs/common';
import { ArcadeLoanV2Subscriber } from './arcade-loan-v2.subscriber';
import { ArcadeLoanV3Subscriber } from './arcade-loan-v3.subscriber';
import { ArcadeLoanService } from './arcade-loan.service';
import { ArcadeLoanScheduler } from './arcade-loan.scheduler';

@Global()
@Module({
  providers: [ArcadeLoanV2Subscriber, ArcadeLoanV3Subscriber, ArcadeLoanService, ArcadeLoanScheduler],
  exports: [ArcadeLoanService]
})
export class ArcadeLoanModule {}
