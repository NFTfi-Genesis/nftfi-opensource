import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Mutex } from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { EthersObserverScheduler } from '../../src/ethers-observer/ethers-observer.scheduler';
import { ContractSubscriber } from '../../src/ethers-observer/contract-subscriber.service';
import { ContractExplorerService } from '../../src/ethers-observer/contract-explorer.service';
import { EthereumReplayService } from '../../src/ethers-observer/replay-strategies/ethereum-replay.service';
import { buildRegisteredHandler } from './factories';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

interface ModuleRefParams {
  includeReplayService: boolean;
}

describe(EthersObserverScheduler.name, () => {
  let service: EthersObserverScheduler;
  let replayService: EthereumReplayService;
  let contractSubscriber: ContractSubscriber;
  let explorerService: ContractExplorerService;
  let schedulerRegistry: SchedulerRegistry;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  const buildModuleRef = async (options: Partial<ModuleRefParams> = {}): Promise<void> => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot(), HealthModule],
      providers: [
        EthersObserverScheduler,
        {
          provide: EthereumReplayService,
          useValue: options.includeReplayService ? { replayEvents: jest.fn() } : null
        },
        {
          provide: ContractSubscriber,
          useValue: { subscribe: jest.fn() } as Partial<ContractSubscriber>
        },
        {
          provide: ContractExplorerService,
          useValue: { getRegisteredHandlers: jest.fn() } as Partial<ContractExplorerService>
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                set: jest.fn(),
                get: jest.fn()
              }
            }
          }
        }
      ]
    }).compile();

    service = moduleRef.get(EthersObserverScheduler);
    replayService = moduleRef.get(EthereumReplayService);
    schedulerRegistry = moduleRef.get(SchedulerRegistry);
    explorerService = moduleRef.get(ContractExplorerService);
    contractSubscriber = moduleRef.get(ContractSubscriber);

    jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
  };

  describe(EthersObserverScheduler.prototype.onApplicationBootstrap.name, () => {
    it('should start replay job if replay service is defined', async () => {
      await buildModuleRef({ includeReplayService: true });
      const replayJob = { start: jest.fn() } as unknown as CronJob<null, null>;
      jest.spyOn(schedulerRegistry, 'getCronJob').mockReturnValue(replayJob);

      service.onApplicationBootstrap();

      expect(replayJob.start).toHaveBeenCalled();
    });

    it('should stop replay job if replay service is not defined', async () => {
      await buildModuleRef({ includeReplayService: false });
      const replayJob = { stop: jest.fn() } as unknown as CronJob<null, null>;
      jest.spyOn(schedulerRegistry, 'getCronJob').mockReturnValue(replayJob);

      service.onApplicationBootstrap();

      expect(replayJob.stop).toHaveBeenCalled();
    });
  });

  describe(EthersObserverScheduler.prototype.replayEvents.name, () => {
    it('should call replay service', async () => {
      await buildModuleRef({ includeReplayService: true });

      jest.spyOn(replayService, 'replayEvents').mockResolvedValueOnce(null);
      await service.replayEvents();

      expect(replayService.replayEvents).toHaveBeenCalled();
    });
  });

  describe(EthersObserverScheduler.prototype.refreshSubscriptions.name, () => {
    it('should subscribe to all registered handlers', async () => {
      await buildModuleRef();
      const handler1 = buildRegisteredHandler();
      const handler2 = buildRegisteredHandler();
      jest.spyOn(explorerService, 'getRegisteredHandlers').mockReturnValueOnce([handler1, handler2]);
      jest.spyOn(contractSubscriber, 'subscribe').mockResolvedValueOnce();

      service.refreshSubscriptions();

      expect(contractSubscriber.subscribe).toHaveBeenCalledWith(handler1);
      expect(contractSubscriber.subscribe).toHaveBeenCalledWith(handler2);
    });
  });
});
