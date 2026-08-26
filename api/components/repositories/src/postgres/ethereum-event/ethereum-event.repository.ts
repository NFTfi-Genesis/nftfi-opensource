import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  EventArchiveRepository as EthersEventArchiveRepository,
  ArchivedEvent,
  ArchivedEventFilter
} from '@nftfi.api/modules/ethers-observer';
import { EthereumEvent } from './ethereum-event.entity';
import { EthereumEventMetadata } from './ethereum-event.types';

@Injectable()
export class EthereumEventRepository implements EthersEventArchiveRepository {
  constructor(
    @InjectRepository(EthereumEvent)
    private repository: Repository<EthereumEvent>
  ) {}

  async upsert<T extends object>(data: ArchivedEvent<T>): Promise<boolean> {
    await this.repository.upsert(this.fromDto(data), {
      conflictPaths: ['contract', 'name', 'blockNumber', 'logIndex'],
      skipUpdateIfNoValuesChanged: true
    });

    return true;
  }

  async findByMetadata<T extends object>(filters: ArchivedEventFilter[]): Promise<ArchivedEvent<T>[]> {
    const toDto = (f: ArchivedEventFilter): Partial<EthereumEvent> => ({
      contract: f.contract,
      name: f.name,
      blockNumber: f.blockNumber,
      logIndex: f.index
    });
    const entries = await this.repository.find({ where: filters.map(toDto) });
    return entries.map(entry => this.toDto(entry) as ArchivedEvent<T>);
  }

  async find<T extends object>(filter: Partial<EthereumEventMetadata>): Promise<ArchivedEvent<T>[]> {
    const entries = await this.repository.find({ where: filter });
    return entries.map(entry => this.toDto(entry) as ArchivedEvent<T>);
  }

  async findEarliestBlockByContract<T extends object>(contractAddress: string): Promise<ArchivedEvent<T>> {
    const entry = await this.repository.findOne({
      where: { contract: contractAddress },
      order: {
        blockNumber: 'ASC'
      }
    });
    return this.toDto(entry) as ArchivedEvent<T>;
  }

  async findLatestBlockByContract<T extends object>(contractAddress: string): Promise<ArchivedEvent<T>> {
    const entry = await this.repository.findOne({
      where: { contract: contractAddress },
      order: {
        blockNumber: 'DESC'
      }
    });
    return this.toDto(entry) as ArchivedEvent<T>;
  }

  async findByContractEvents<T extends object>(
    contractAddress: string,
    eventNames: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<ArchivedEvent<T>[]> {
    const entries = await this.repository.find({
      where: {
        contract: contractAddress,
        name: In(eventNames),
        blockNumber: Between(fromBlock, toBlock)
      },
      order: { blockNumber: 'ASC', logIndex: 'ASC' }
    });

    return entries.map(entry => this.toDto(entry) as ArchivedEvent<T>);
  }

  async findByTxHash<T extends object = object>(txHash: string): Promise<ArchivedEvent<T>[]> {
    const entries = await this.repository.find({
      where: {
        tx: txHash
      },
      order: { blockNumber: 'ASC', logIndex: 'ASC' }
    });

    return entries.map(entry => this.toDto(entry) as ArchivedEvent<T>);
  }

  private toDto<T extends object>(entry: EthereumEvent<T>): ArchivedEvent<T> {
    if (!entry) return null;
    return {
      contract: entry.contract,
      name: entry.name,
      blockNumber: entry.blockNumber,
      txHash: entry.tx,
      index: entry.logIndex,
      emittedAt: entry.emittedAt,
      played: entry.played,
      args: entry.args as T
    };
  }

  private fromDto<T extends object>(dto: ArchivedEvent<T>): Omit<EthereumEvent<T>, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      contract: dto.contract,
      name: dto.name,
      blockNumber: dto.blockNumber,
      logIndex: dto.index,
      tx: dto.txHash,
      emittedAt: dto.emittedAt,
      played: dto.played,
      args: dto.args
    };
  }
}
