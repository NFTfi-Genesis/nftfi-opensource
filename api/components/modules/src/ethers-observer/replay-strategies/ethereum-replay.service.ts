import chalk from 'chalk';
import { chain } from 'lodash';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ContractExplorerService } from '../contract-explorer.service';
import { ConfigToken, type EthersObserverModuleConfig } from '../config.provider';
import { Contract, Event } from '../contract';
import { ContractRepository } from '../contract.repository';
import { ArchivedEventFilter, type EventArchiveRepository, EventArchiveRepositoryToken } from '../event-archive.types';
import { ReplayService } from './replay.service';

@Injectable()
export class EthereumReplayService extends ReplayService implements OnModuleInit {
  protected readonly logger = new Logger(EthereumReplayService.name);

  constructor(
    protected readonly contractExplorerService: ContractExplorerService,
    protected readonly ethersFacade: EthersFacade,
    protected readonly contractRepository: ContractRepository,
    @Inject(EventArchiveRepositoryToken) private readonly eventArchiveRepository: EventArchiveRepository,
    @Inject(ConfigToken) protected readonly config: EthersObserverModuleConfig
  ) {
    super(contractExplorerService, ethersFacade, contractRepository, config);
  }

  onModuleInit(): void {
    this.logger.log('Module initialized');
  }

  protected override async getContractStartBlock(contract: Contract): Promise<number> {
    const cachedBlock = await this.contractRepository.getReplayBlock(contract);
    if (cachedBlock) {
      return cachedBlock;
    }

    const archivedEvent = await this.eventArchiveRepository.findLatestBlockByContract(contract.address);
    if (archivedEvent) {
      await this.contractRepository.updateReplayBlock(contract, archivedEvent.blockNumber);
      return archivedEvent.blockNumber;
    }

    return contract.metadata?.replay.startAt || 0;
  }

  protected override async getContractEndBlock(_contract: Contract): Promise<number> {
    const block = await this.ethersFacade.getLatestBlock();
    return block.number;
  }

  protected async findEvents(
    contract: Contract,
    eventNames: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> {
    let queriedEvents: Event[] = [];
    try {
      for (const eventName of eventNames) {
        const events = await contract.queryFilter(eventName, fromBlock, toBlock);
        queriedEvents = queriedEvents.concat(events);
      }
      if (!queriedEvents.length) return [];

      const alreadyPlayedEventKeys = new Set();
      const existingEvents = await this.eventArchiveRepository.findByMetadata(
        queriedEvents.map(e => this.mapEventToMetadata(e))
      );
      for (const e of existingEvents) {
        if (!e.played) continue;
        alreadyPlayedEventKeys.add(this.buildEventKey(e));
      }
      const values = chain(queriedEvents)
        .filter(e => !alreadyPlayedEventKeys.has(this.buildEventKey(this.mapEventToMetadata(e))))
        .sortBy('blockNumber', 'logIndex')
        .map(e => Object.assign(e, { args: contract.getEventPayload(e) }))
        .value();
      return values;
    } catch (error) {
      const ccontract = chalk.magentaBright(contract.constructor.name);
      const cevent = chalk.cyan(eventNames.join('|'));
      const clistener = chalk.magenta(`${ccontract}[${cevent}] @ ${contract.address}`);
      const cfrom = chalk.redBright(fromBlock);
      const cto = chalk.redBright(toBlock);
      this.logger.error(chalk.red(`Error fetching events for ${clistener} from ${cfrom} to ${cto}: ${error}`));
      return await this.findEvents(contract, eventNames, fromBlock, toBlock);
    }
  }

  private buildEventKey(data: ArchivedEventFilter): string {
    return `${data.contract}-${data.name}-${data.blockNumber}-${data.index}`;
  }

  private mapEventToMetadata(event: Event): ArchivedEventFilter {
    return {
      contract: event.address,
      name: event.event,
      blockNumber: event.blockNumber,
      index: event.logIndex
    };
  }
}
