import { EthereumEvent } from '../../src/postgres/ethereum-event';

export const buildPostgresEthereumEvent = (overrides: Partial<EthereumEvent> = {}): EthereumEvent =>
  ({
    id: 1,
    contract: '0xabc',
    name: 'LoanStarted',
    blockNumber: 12,
    logIndex: 3,
    tx: '0xtx',
    played: true,
    args: { foo: 'bar' },
    emittedAt: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as EthereumEvent);
