import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanNotificationScheduler } from './loan-notification.scheduler';
import { LoanNotificationService } from './loan-notification.service';
import { LoanNotificationContextService } from './loan-notification-context.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MarketLoan])],
  exports: [LoanNotificationService],
  providers: [LoanNotificationScheduler, LoanNotificationService, LoanNotificationContextService, MarketLoanRepository]
})
export class LoanNotificationModule {}
