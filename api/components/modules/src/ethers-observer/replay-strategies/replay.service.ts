import EventEmitter from 'events';
import { first } from 'lodash';
import chalk from 'chalk';
import { Logger } from '@nestjs/common';
import { EthersFacade } from '../../ethers-provider';
import { ContractExplorerService } from '../contract-explorer.service';
import { ContractRepository } from '../contract.repository';
import { EthersObserverModuleConfig } from '../config.provider';
import { Contract, Event } from '../contract';
import { ContractListenerMetadata } from '../contract-explorer.types';
import { BlockRange, ReplayEvent } from './replay.types';

export class ReplayService {
  protected readonly logger = new Logger(ReplayService.name);
  public readonly eventListener = new EventEmitter();

  constructor(
    protected readonly contractExplorerService: ContractExplorerService,
    protected readonly ethersFacade: EthersFacade,
    protected readonly contractRepository: ContractRepository,
    protected readonly config: EthersObserverModuleConfig
  ) {}

  async replayEvents(): Promise<void> {
    const groups = this.contractExplorerService.getRegisteredHandlerGroups();

    this.eventListener.emit(ReplayEvent.Started);

    for (const group of groups) {
      await this.replayGroupEvents(group);
    }

    this.eventListener.emit(ReplayEvent.Done);
  }

  private async getBlockRangesForContracts(groups: ContractListenerMetadata[][]): Promise<Record<string, BlockRange>> {
    const blocksMap: Record<string, BlockRange> = {};
    for (const group of groups) {
      const contract = this.getGroupContract(group);
      const [startBlock, endBlock] = await Promise.all([
        this.getContractStartBlock(contract),
        this.getContractEndBlock(contract)
      ]);

      if (startBlock > endBlock) {
        this.logger.warn(`Handler (${contract.constructor.name}) has invalid block range: ${startBlock} > ${endBlock}`);
        continue;
      }

      blocksMap[contract.address] = { start: startBlock, end: endBlock };
    }
    return blocksMap;
  }

  private getNextBlockRangeChunk(current: BlockRange): BlockRange {
    const nextEndBlock = Math.min(current.start + this.config.replay.chunkSize, current.end);
    return { start: current.start, end: nextEndBlock };
  }

  private getGroupContract(group: ContractListenerMetadata[]): Contract {
    const handler = first(group);
    if (!handler) {
      throw new Error('Cannot get contract from empty handler group');
    }
    return handler.contract;
  }

  private async replayGroupEvents(group: ContractListenerMetadata[]): Promise<void> {
    if (!group.length) return;

    const blocksMap = await this.getBlockRangesForContracts([group]);
    const contract = this.getGroupContract(group);
    const contractBlocks = blocksMap[contract.address];
    if (!contractBlocks) return;

    const blocks = this.getNextBlockRangeChunk(blocksMap[contract.address]);
    if (blocks.start >= contractBlocks.end) {
      contract.replayed = true;
      return;
    }

    const events: Event[] = await this.findEvents(
      contract,
      group.map(h => h.eventName),
      blocks.start,
      blocks.end
    );

    for (const event of events) {
      const handler = group.find(h => h.eventName === event.event);
      const played = await this.contractExplorerService.callHandler(handler.handler, handler.params, contract, event);
      if (!played) {
        throw new Error(
          `Failed to play event ${event.event} @ ${event.address} in block ${event.blockNumber}. Aborting replay.`
        );
      }

      await this.contractRepository.updateReplayBlock(contract, event.blockNumber);
    }

    if (events.length) {
      const eventNames = Array.from(new Set(events.map(e => e.event)));
      const ccontract = chalk.magentaBright(contract.constructor.name);
      const cevent = chalk.cyan(eventNames.join('|'));
      const clistener = chalk.magenta(`${ccontract}[${cevent}] @ ${contract.address}`);
      const cstart = chalk.greenBright(blocks.start);
      const cend = chalk.greenBright(blocks.end);
      const ccount = chalk.greenBright(events.length);
      const cevents = events.length > 1 ? 'events' : 'event';

      this.logger.log(
        chalk.green(`Replayed ${ccount} ${cevents} for ${clistener} between blocks ${cstart} and ${cend}`)
      );
    }

    await this.contractRepository.updateReplayBlock(contract, blocks.end);
    return this.replayGroupEvents(group);
  }

  protected async getContractStartBlock(_contract: Contract): Promise<number> {
    throw new Error('Method not implemented!');
  }

  protected async getContractEndBlock(_contract: Contract): Promise<number> {
    throw new Error('Method not implemented!');
  }

  protected async findEvents(
    contract: Contract,
    eventNames: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> {
    contract;
    eventNames;
    fromBlock;
    toBlock;
    throw new Error('Method not implemented!');
  }
}
