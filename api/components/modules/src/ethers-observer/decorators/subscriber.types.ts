import { Log, Block } from '@ethersproject/abstract-provider';
import { Contract } from '../contract';

export type EventLogKeys = keyof Pick<
  Log,
  'transactionHash' | 'transactionIndex' | 'blockHash' | 'blockNumber' | 'address' | 'topics' | 'logIndex' | 'data'
>;

export type EventBlockKeys = keyof Pick<Block, 'number' | 'timestamp'>;

export type ContractEventMetatype = typeof Contract;

export interface ContractEventListenerMetadata {
  event: string;
  contract?: ContractEventMetatype;
}
