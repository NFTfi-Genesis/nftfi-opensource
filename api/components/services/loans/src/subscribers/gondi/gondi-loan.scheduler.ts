import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanHelperService } from '../loan-helper.service';

@Injectable()
export class GondiLoanScheduler {
  constructor(private readonly loanHelper: LoanHelperService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  async onLoanDefaulted(): Promise<void> {
    await this.loanHelper.markOverdueLoansAsDefaulted(MarketLoanProtocol.Gondi);
  }
}
