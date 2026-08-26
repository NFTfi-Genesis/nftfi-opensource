import { DynamicModule, Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConfigToken,
  ContractExplorerService,
  ContractRepository,
  EventArchiveReplayService
} from '@nftfi.api/modules/ethers-observer';
import { EthersObserverModuleConfig } from '@nftfi.api/modules/ethers-observer/config.provider';
import { EventArchiveRepositoryToken } from '@nftfi.api/modules/ethers-observer/event-archive.types';
import { EthereumEvent, EthereumEventRepository } from '@nftfi.api/repositories/postgres/ethereum-event';

interface Options {
  label?: string;
}

@Global()
@Module({})
export class EventArchiveReplayModule {
  static forRoot(options: Options = {}): DynamicModule {
    return {
      module: EventArchiveReplayModule,
      imports: [DiscoveryModule, TypeOrmModule.forFeature([EthereumEvent])],
      providers: [
        {
          provide: ConfigToken,
          useValue: {
            label: options.label,
            replay: {
              enabled: true,
              chunkSize: 1_000
            }
          } as EthersObserverModuleConfig
        },
        EthereumEventRepository,
        { provide: EventArchiveRepositoryToken, useExisting: EthereumEventRepository },
        EventArchiveReplayService,
        ContractExplorerService,
        ContractRepository
      ],
      exports: [ContractRepository, EventArchiveRepositoryToken]
    };
  }
}
