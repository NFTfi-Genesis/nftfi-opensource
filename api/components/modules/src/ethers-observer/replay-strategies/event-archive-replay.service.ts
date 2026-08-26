import { Inject, Injectable, Logger } from '@nestjs/common';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { ContractExplorerService } from '../contract-explorer.service';
import { ConfigToken, type EthersObserverModuleConfig } from '../config.provider';
import { Contract, Event } from '../contract';
import { ContractRepository } from '../contract.repository';
import { type EventArchiveRepository, EventArchiveRepositoryToken } from '../event-archive.types';
import { ReplayService } from './replay.service';

@Injectable()
export class EventArchiveReplayService extends ReplayService {
  protected readonly logger = new Logger(EventArchiveReplayService.name);

  constructor(
    protected readonly contractExplorerService: ContractExplorerService,
    protected readonly ethersFacade: EthersFacade,
    protected readonly contractRepository: ContractRepository,
    @Inject(EventArchiveRepositoryToken) private readonly eventArchiveRepository: EventArchiveRepository,
    @Inject(ConfigToken) protected readonly config: EthersObserverModuleConfig
  ) {
    super(contractExplorerService, ethersFacade, contractRepository, config);
  }

  protected override async getContractStartBlock(contract: Contract): Promise<number> {
    const cachedBlock = await this.contractRepository.getReplayBlock(contract);
    if (cachedBlock) {
      return cachedBlock;
    }

    const archivedEvent = await this.eventArchiveRepository.findEarliestBlockByContract(contract.address);
    if (archivedEvent) {
      await this.contractRepository.updateReplayBlock(contract, archivedEvent.blockNumber);
      return archivedEvent.blockNumber;
    }

    return contract.metadata?.replay.startAt || 0;
  }

  protected override async getContractEndBlock(contract: Contract): Promise<number> {
    const archivedEvent = await this.eventArchiveRepository.findLatestBlockByContract(contract.address);
    if (archivedEvent) {
      return archivedEvent.blockNumber;
    }

    const block = await this.ethersFacade.getLatestBlock();
    return block.number;
  }

  protected async findEvents(
    contract: Contract,
    events: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> {
    const archivedEvents = await this.eventArchiveRepository.findByContractEvents(
      contract.address,
      events,
      fromBlock,
      toBlock
    );

    return archivedEvents.map(
      event =>
        ({
          address: event.contract,
          blockNumber: event.blockNumber,
          event: event.name,
          logIndex: event.index,
          transactionHash: event.txHash,
          args: event.args,
          getBlock: async () => this.ethersFacade.getBlock(event.blockNumber),
          getTransaction: async () => this.ethersFacade.getTransaction(event.txHash),
          getTransactionReceipt: async () => this.ethersFacade.getTransactionReceipt(event.txHash)
        } as Event)
    );
  }
}
