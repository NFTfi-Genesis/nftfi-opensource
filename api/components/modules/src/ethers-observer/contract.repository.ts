import { get, min } from 'lodash';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Inject, Injectable } from '@nestjs/common';
import { InjectEthersProvider } from 'nestjs-ethers';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { Contract, FragmentRunningEvent } from './contract';
import { MetadataKey, ContractBuilderMetadata } from './decorators';
import { ConfigToken, type EthersObserverModuleConfig } from './config.provider';

const CACHE_TTL = 60 * 60 * 24 * 7 * 1000; // 7 days

@Injectable()
export class ContractRepository {
  private entities: Contract[] = [];

  constructor(
    @InjectEthersProvider() private readonly provider: StaticJsonRpcProvider,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly ethersFacade: EthersFacade,
    private readonly configService: ConfigService,
    @Inject(ConfigToken) protected readonly config: EthersObserverModuleConfig
  ) {}

  create(metatype: typeof Contract): Contract {
    const metadata: ContractBuilderMetadata = Reflect.getMetadata(MetadataKey.ETHERS_CONTRACT_BUILDER, metatype);
    const getMetadataValue = <T>(field: string, defaultValue: T): T => {
      const getter = get(metadata, field);
      return typeof getter === 'function' ? getter(this.configService) : getter ?? defaultValue;
    };
    const address = getMetadataValue('address', '');
    const replayStartAt = getMetadataValue('replay.startAt', 0);
    const replayEnabled = getMetadataValue('replay.enabled', false);

    if (!address) {
      throw new Error(`Contract ${metatype.name} does not contain an address in its metadata`);
    }

    const instance = new metatype(address, metadata.ABI, this.provider, this.cacheManager, {
      replay: {
        enabled: replayEnabled,
        startAt: replayStartAt
      }
    });
    if (!this.config.replay.enabled) {
      instance.replayed = true;
    }

    this.entities.push(instance);
    return instance;
  }

  findByType<T = Contract>(metatype: typeof Contract): T {
    return this.entities.find(provider => provider.constructor == metatype) as T;
  }

  findByAddress<T = Contract>(address: string): T {
    return this.entities.find(provider => provider.address.toLowerCase() === address.toLowerCase()) as T;
  }

  findOrCreate<T = Contract>(metatype: typeof Contract): T {
    const entity = this.findByType(metatype) ?? this.create(metatype);
    return entity as T;
  }

  async getLastEventBlockTime(contract: Contract): Promise<Date> {
    const now = new Date(0);

    const replayBlock = await this.getReplayBlock(contract);
    if (!replayBlock) return now;

    const block = await this.ethersFacade.getBlock(replayBlock);
    if (!block) return now;

    return new Date(block.timestamp * 1000);
  }

  async getReplayCursorDate(contract: Contract): Promise<Date> {
    const events = await Promise.all(
      Object.values(contract._runningEvents).map((_e: FragmentRunningEvent) => this.getLastEventBlockTime(contract))
    );
    const filteredEvents = events.filter(date => date instanceof Date && !isNaN(date.getTime()));
    return filteredEvents.length ? min(filteredEvents) : new Date(0);
  }

  async updateReplayBlock(contract: Contract, blockNumber: number): Promise<void> {
    return this.cacheManager.set(this.getEventReplayKey(contract), blockNumber, CACHE_TTL);
  }

  async getReplayBlock(contract: Contract): Promise<number> {
    const state = await this.cacheManager.get(this.getEventReplayKey(contract));
    return Number(state);
  }

  async deleteReplayBlock(contract: Contract): Promise<void> {
    return this.cacheManager.del(this.getEventReplayKey(contract));
  }

  static getContractEventKey(contract: Contract, eventName: string): string {
    return `${contract.address as string}_${eventName}`;
  }

  private get replayKey(): string {
    return `ethers-observer:replay` + (this.config.label ? `-${this.config.label}` : '');
  }

  private getEventReplayKey(contract: Contract): string {
    return `${this.replayKey}:${contract.address as string}`;
  }
}
