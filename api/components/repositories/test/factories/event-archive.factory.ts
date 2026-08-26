import { ArchivedEvent } from '@nftfi.api/modules/ethers-observer';

export const buildEventArchive = (overrides: Partial<ArchivedEvent<object>> = {}): ArchivedEvent<object> => ({
  name: 'Type',
  contract: '0x0',
  blockNumber: 1,
  txHash: '0x0',
  emittedAt: new Date(),
  index: 1,
  played: true,
  args: {
    _account: '0x1'
  },
  ...overrides
});
