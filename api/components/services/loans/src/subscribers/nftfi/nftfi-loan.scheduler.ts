import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import { LoanHelperService } from '../loan-helper.service';
import { NftfiLoanService } from './nftfi-loan.service';

@Injectable()
export class NftfiLoanScheduler {
  constructor(private readonly loanService: NftfiLoanService, private readonly loanHelper: LoanHelperService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  handleOverdueLoans(): Promise<void> {
    return this.loanHelper.markOverdueLoansAsDefaulted(MarketLoanProtocol.Nftfi);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  handleUpdateLoansWithRefiBorrower(): Promise<void> {
    return this.loanService.updateLoansWithRefiBorrower();
  }
}
