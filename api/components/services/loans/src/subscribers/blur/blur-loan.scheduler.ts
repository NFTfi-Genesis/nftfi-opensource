import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanHelperService } from '../loan-helper.service';
import { BlurLoanService } from './blur-loan.service';

@Injectable()
export class BlurLoanScheduler {
  constructor(private readonly loanHelper: LoanHelperService, private readonly blurLoanService: BlurLoanService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  async onLoanDefaulted(): Promise<void> {
    await this.loanHelper.markOverdueLoansAsDefaulted(MarketLoanProtocol.Blur);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Mutex()
  async onLoanNumbersUpdate(): Promise<void> {
    await this.blurLoanService.updateAmounts();
  }
}
