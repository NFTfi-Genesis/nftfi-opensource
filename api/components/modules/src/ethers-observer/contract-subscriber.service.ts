import chalk from 'chalk';
import { Logger, Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { Cache } from 'cache-manager';
import { Mutex as RedisMutex } from 'redis-semaphore';
import { Event } from '@ethersproject/contracts';
import { type ContractListenerMetadata } from './contract-explorer.types';
import { ContractExplorerService } from './contract-explorer.service';

const LOCK_1_MIN = 60 * 1000;

@Injectable()
export class ContractSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractSubscriber.name);
  private readonly mutexes: Record<string, RedisMutex> = {};

  constructor(
    private readonly explorerService: ContractExplorerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache<RedisStore>
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.cacheManager?.store?.client) {
      throw new Error('Cache manager must be configured with a RedisStore');
    }

    const promises = this.explorerService.getRegisteredHandlers().map(listener => this.subscribe(listener));
    await Promise.all(promises);
  }

  onModuleDestroy(): void {
    for (const listener of this.explorerService.getRegisteredHandlers()) {
      this.unsubscribe(listener);
    }
  }

  async subscribe(metadata: ContractListenerMetadata): Promise<void> {
    const { contract, eventName, handler, params } = metadata;

    if (contract.listenerCount(eventName) > 0 || !contract.replayed) return;

    const mutex = this.getMutexClient(metadata);
    const acquired = await mutex.tryAcquire();

    if (!acquired) return;

    const ccontract = chalk.magentaBright(contract.constructor.name);
    const cevent = chalk.cyan(eventName);
    const clistener = chalk.magenta(`${ccontract}[${cevent}] @ ${contract.address}`);

    try {
      contract.on(eventName, (...args: unknown[]) => {
        const log = args[args.length - 1] as Event;
        log.args = contract.getEventPayload(log);

        const cblocknum = chalk.greenBright(log.blockNumber);
        this.logger.log(chalk.green(`Event ${clistener} at block ${cblocknum}, tx ${log.transactionHash}`));
        this.explorerService.callHandler(handler, params, contract, log);
      });
      this.logger.log(chalk.green(`${clistener} registered`));
    } catch (e) {
      this.unsubscribe(metadata);
      this.logger.error(`Error subscribing ${clistener}: ${e.message}`);
    }
  }

  async unsubscribe(metadata: ContractListenerMetadata): Promise<void> {
    const { contract, eventName } = metadata;

    if (!contract.listenerCount(eventName)) return;

    const ccontract = chalk.magentaBright(contract.constructor.name);
    const cevent = chalk.cyan(eventName);
    const clistener = chalk.magenta(`${ccontract}[${cevent}] @ ${contract.address}`);

    const mutex = this.getMutexClient(metadata);
    try {
      contract.removeAllListeners(eventName);
      if (mutex.isAcquired) await mutex.release();
      this.logger.log(chalk.green(`${clistener} unregistered`));
    } catch (e) {
      this.logger.error(`Error unsubscribing ${clistener}: ${e.message}`);
    }
  }

  private getMutexClient(metadata: ContractListenerMetadata): RedisMutex {
    const { contract, eventName } = metadata;
    const key = `${contract.constructor.name}_${contract.address}[${eventName}]`;
    if (!this.mutexes[key]) {
      this.mutexes[key] = new RedisMutex(this.cacheManager.store.client, key, {
        acquireAttemptsLimit: 3,
        retryInterval: 1000,
        refreshInterval: 1000,
        lockTimeout: LOCK_1_MIN,
        onLockLost: (): void => {
          const ccontract = chalk.magentaBright(contract.constructor.name);
          const cevent = chalk.cyan(eventName);
          const clistener = chalk.magenta(`${ccontract}[${cevent}] @ ${contract.address}`);
          this.logger.log(chalk.green(`${clistener} lost its lock. Unsubscribing...`));
          this.unsubscribe(metadata);
        }
      });
    }

    return this.mutexes[key];
  }
}
