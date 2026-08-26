export interface ArchivedEvent<T extends object = object> {
  name: string;
  contract: string;
  blockNumber: number;
  index: number;
  txHash: string;
  emittedAt: Date;
  played: boolean;

  args: T;
}

export type ArchivedEventFilter = Pick<ArchivedEvent, 'contract' | 'name' | 'blockNumber' | 'index'>;

export interface EventArchiveRepository {
  findByMetadata(filters: ArchivedEventFilter[]): Promise<ArchivedEvent[]>;
  upsert<T extends object = object>(data: ArchivedEvent<T>): Promise<boolean>;
  findEarliestBlockByContract(contractAddress: string): Promise<ArchivedEvent | null>;
  findLatestBlockByContract(contractAddress: string): Promise<ArchivedEvent | null>;
  findByContractEvents<T extends object = object>(
    contractAddress: string,
    events: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<ArchivedEvent<T>[]>;
  findByTxHash<T extends object = object>(txHash: string): Promise<ArchivedEvent<T>[]>;
}

export const EventArchiveRepositoryToken = 'EthersEventArchiveRepositoryToken';
