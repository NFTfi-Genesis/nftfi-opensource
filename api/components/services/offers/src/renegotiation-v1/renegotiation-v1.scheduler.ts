import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { RenegotiationV1Service } from './renegotiation-v1.service';

@Injectable()
export class RenegotiationV1Scheduler {
  constructor(private readonly renegotiationService: RenegotiationV1Service) {}

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async onMarkExpired(): Promise<void> {
    await this.renegotiationService.markExpired();
  }
}
