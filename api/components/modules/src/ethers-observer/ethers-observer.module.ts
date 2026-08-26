import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ContractExplorerService } from './contract-explorer.service';
import { EthereumReplayService } from './replay-strategies/ethereum-replay.service';
import { ContractSubscriber } from './contract-subscriber.service';
import { ContractRepository } from './contract.repository';
import {
  ConfigToken,
  EthersObserverModuleAsyncOptions,
  EthersObserverModuleConfig,
  EthersObserverModuleOptions,
  getModuleConfigFactoryProvider
} from './config.provider';
import { EthersObserverScheduler } from './ethers-observer.scheduler';
import { EventArchiveRepository, EventArchiveRepositoryToken } from './event-archive.types';

@Global()
@Module({})
export class EthersObserverModule {
  static forRootAsync(options: EthersObserverModuleAsyncOptions): DynamicModule {
    const configFactoryProvider = getModuleConfigFactoryProvider(options);
    return {
      module: EthersObserverModule,
      global: true,
      imports: [DiscoveryModule, ScheduleModule.forRoot()],
      providers: [configFactoryProvider, ...EthersObserverModule.getModuleProviders(options)],
      exports: [ContractRepository]
    };
  }

  private static getModuleProviders({ tokens }: EthersObserverModuleOptions): Provider[] {
    const providers: Provider[] = [
      {
        provide: EthereumReplayService,
        inject: [ContractExplorerService, tokens.eventArchiveRepository, EthersFacade, ContractRepository, ConfigToken],
        useFactory: (
          contractExplorerService: ContractExplorerService,
          eventArchiveRepository: EventArchiveRepository,
          ethersFacade: EthersFacade,
          contractRepository: ContractRepository,
          config: EthersObserverModuleConfig
        ): EthereumReplayService => {
          if (!config.replay.enabled) return null;

          return new EthereumReplayService(
            contractExplorerService,
            ethersFacade,
            contractRepository,
            eventArchiveRepository,
            config
          );
        }
      },
      {
        provide: EventArchiveRepositoryToken,
        useExisting: tokens.eventArchiveRepository
      },
      ContractSubscriber,
      ContractExplorerService,
      ContractRepository,
      EthersObserverScheduler
    ];

    return providers;
  }
}
