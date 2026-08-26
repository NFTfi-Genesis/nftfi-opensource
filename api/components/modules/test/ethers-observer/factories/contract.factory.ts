import { Block, StaticJsonRpcProvider } from '@ethersproject/providers';
import { Interface, ParamType, Result } from '@ethersproject/abi';
import { ContractListenerMetadata } from '../../../src/ethers-observer/contract-explorer.types';
import { Contract, Event } from '../../../src/ethers-observer';

type ContractOverrides = Partial<
  Pick<Contract, 'address' | 'transactionHash' | 'removeAllListeners' | 'listenerCount' | 'call' | 'metadata'> &
    Partial<{ interface: Partial<Interface> }>
>;

export const buildContract = (
  overrides: ContractOverrides = {},
  functions: { [key: string]: () => void } = {}
): Contract => {
  const address = overrides.address || '0x0';
  const testContract = new Contract(
    address,
    [],
    {} as StaticJsonRpcProvider,
    null,
    overrides.metadata || {
      replay: {
        startAt: 0,
        enabled: false
      }
    }
  );

  Object.assign(testContract, {
    address,
    topics: [],
    interface: {
      getEvent: jest.fn().mockReturnValue([]),
      fragments: [],
      ...overrides.interface
    },
    getEventPayload: Contract.prototype.getEventPayload,
    on: jest.fn(),
    call: overrides.call || jest.fn(),
    queryFilter: jest.fn().mockReturnValue([]),
    listenerCount: overrides.listenerCount || jest.fn().mockReturnValue(0),
    removeAllListeners: overrides.removeAllListeners || jest.fn(),
    ...functions
  });

  return testContract;
};

export const buildRegisteredHandler = (
  overrides: Partial<ContractListenerMetadata> = {}
): ContractListenerMetadata => ({
  key:
    overrides.contract && overrides.eventName
      ? `${overrides.contract.address}_${overrides.eventName}`
      : '0x0-Transfer-0x0',
  contract: buildContract(),
  eventName: 'Transfer',
  handler: jest.fn(),
  params: { '@test': { index: 0, data: 'test' } },
  ...overrides
});

export const buildBlock = (overrides: Partial<Block> = {}): Block =>
  ({
    timestamp: 1713279324,
    ...overrides
  } as Block);

export const buildEventLog = (overrides: Partial<Event> = {}): Event =>
  ({
    address: '0x0',
    index: 0,
    eventName: 'Event',
    eventSignature: 'Event(uint32,address,address)',
    blockHash: '0x0',
    blockNumber: 0,
    data: '0x0',
    topics: [],
    transactionHash: '0x974c336c349bf9e3ef4bcdc73aa50b73f6bac9f2d9955a9e08856e41024290a8',
    transactionIndex: 0,
    getBlock: jest.fn().mockReturnValue(buildBlock()),
    args: ['123', '0x123', '0x456'] as Result,
    fragment: {
      type: 'event',
      anonymous: false,
      inputs: [
        { indexed: true, name: 'loanId', type: 'uint32' },
        { indexed: true, name: 'borrower', type: 'address' },
        { indexed: true, name: 'lender', type: 'address' }
      ] as ParamType[],
      topicHash: 'd1s2a3',
      name: 'Event',
      format: jest.fn()
    },
    ...overrides
  } as Event);
