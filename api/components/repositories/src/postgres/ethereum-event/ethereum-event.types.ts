import { EthereumEvent } from './ethereum-event.entity';

export type DraftEthereumEvent = Omit<EthereumEvent, 'createdAt' | 'updatedAt'>;

export type EthereumEventMetadata = Pick<EthereumEvent, 'contract' | 'name' | 'blockNumber' | 'logIndex' | 'tx'>;
