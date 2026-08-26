import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core/decorators';
import { EthereumReplayService } from './replay-strategies/ethereum-replay.service';
import { ContractSubscriber } from './contract-subscriber.service';
import { ContractExplorerService } from './contract-explorer.service';

const CRON_REPLAY = `EthersObserverScheduler:Replay`;

@Injectable()
export class EthersObserverScheduler {
  constructor(
    private readonly replayService: EthereumReplayService,
    private readonly contractSubscriber: ContractSubscriber,
    private readonly explorerService: ContractExplorerService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  onApplicationBootstrap(): void {
    const replayJob = this.schedulerRegistry.getCronJob(CRON_REPLAY);

    if (this.replayService) {
      replayJob.start();
    } else {
      replayJob.stop();
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: CRON_REPLAY })
  @Mutex()
  async replayEvents(): Promise<void> {
    await this.replayService.replayEvents();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  refreshSubscriptions(): void {
    for (const listener of this.explorerService.getRegisteredHandlers()) {
      this.contractSubscriber.subscribe(listener);
    }
  }
}
