import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { LoanNotificationService } from './loan-notification.service';

@Injectable()
export class LoanNotificationScheduler {
  constructor(private readonly loanNotificationService: LoanNotificationService) {}

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async onLoanIsAlmostDue(): Promise<void> {
    await this.loanNotificationService.notifyLoansMaturityByBorrower();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async onNotifyLoansMaturityByLender(): Promise<void> {
    await this.loanNotificationService.notifyLoansMaturityByLender();
  }

  // @TODO fix
  // @Cron(CronExpression.EVERY_MINUTE)
  // @Mutex()
  // async onNotifyLoansMaturityOnPlatform(): Promise<void> {
  //   await this.loanNotificationService.notifyLoansMaturityOnPlatform();
  // }
}
