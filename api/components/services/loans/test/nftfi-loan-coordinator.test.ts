import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract } from '@nftfi.api/modules/ethers-observer';
import { NftfiLoanCoordinator } from '../src/subscribers/nftfi/nftfi-loan-coordinator';

jest.mock('@nftfi.api/modules/ethers-observer', () => ({
  Contract: jest.fn()
}));

const LOAN_V23_FIXED = '0xd0a40eb7fd94ee97102ba8e9342243a2b2e22207';
const LOAN_V3_ASSET = '0x9f10d706d789e4c76a1a6434cd1a9841c875c0a6';
const COORDINATOR_V23 = '0x329e090ace410ac8d86f1f0c2a13486884e7072a';
const COORDINATOR_V3 = '0xa6d93abc54268cf849a93e867c129786f04fd2e6';

const buildConfigService = (overrides: Record<string, unknown> = {}): ConfigService => {
  const config = {
    ethereum: {
      contracts: {
        nftfi: {
          loanV2Fixed: { address: '0xloanv2' },
          loanV2FixedCollection: { address: '0xloanv2col' },
          loanV21Fixed: { address: '0xloanv21' },
          loanV23Fixed: { address: LOAN_V23_FIXED },
          loanV23FixedCollection: { address: '0xloanv23col' },
          loanV3Asset: { address: LOAN_V3_ASSET },
          loanV3Collection: { address: '0xloanv3col' },
          coordinatorV2: { address: '0xcoordinatorv2' },
          coordinatorV23: { address: COORDINATOR_V23 },
          coordinatorV3: { address: COORDINATOR_V3 },
          ...overrides
        }
      }
    }
  };
  return { get: (key: string): unknown => (key === 'ethereum' ? config.ethereum : undefined) } as ConfigService;
};

describe(NftfiLoanCoordinator.name, () => {
  let callMock: jest.Mock;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => void 0);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    callMock = jest.fn();
    (Contract as unknown as jest.Mock).mockImplementation(() => ({
      call: callMock
    }));
  });

  it('resolves smartNftId from v2-3 coordinator', async () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService(), null);
    coordinator.onModuleInit();
    callMock.mockResolvedValue({ null: { loanContract: LOAN_V23_FIXED, smartNftId: '1715004', status: 1 } });

    const result = await coordinator.getSmartNftId(LOAN_V23_FIXED, '100');

    expect(result).toBe('1715004');
    expect(callMock).toHaveBeenCalledWith('getLoanData', '100');
  });

  it('resolves smartNftId from v3 coordinator', async () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService(), null);
    coordinator.onModuleInit();
    callMock.mockResolvedValue({ null: { loanContract: LOAN_V3_ASSET, smartNftId: '255', status: 1 } });

    const result = await coordinator.getSmartNftId(LOAN_V3_ASSET, '200');

    expect(result).toBe('255');
  });

  it('returns null for unknown loan contract', async () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService(), null);
    coordinator.onModuleInit();

    const result = await coordinator.getSmartNftId('0xunknown', '100');

    expect(result).toBeNull();
    expect(callMock).not.toHaveBeenCalled();
  });

  it('throws when getLoanData call fails', async () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService(), null);
    coordinator.onModuleInit();
    callMock.mockRejectedValue(new Error('RPC timeout'));

    await expect(coordinator.getSmartNftId(LOAN_V23_FIXED, '100')).rejects.toThrow('RPC timeout');
  });

  it('returns null when smartNftId is zero', async () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService(), null);
    coordinator.onModuleInit();
    callMock.mockResolvedValue({ null: { loanContract: LOAN_V23_FIXED, smartNftId: '0', status: 1 } });

    const result = await coordinator.getSmartNftId(LOAN_V23_FIXED, '100');

    expect(result).toBeNull();
  });

  it('handles case-insensitive loan contract addresses', async () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService(), null);
    coordinator.onModuleInit();
    callMock.mockResolvedValue({ null: { loanContract: LOAN_V23_FIXED, smartNftId: '1', status: 1 } });

    const result = await coordinator.getSmartNftId(LOAN_V23_FIXED.toUpperCase(), '100');

    expect(result).toBe('1');
  });

  it('throws on init when coordinator address is not configured', () => {
    const coordinator = new NftfiLoanCoordinator(buildConfigService({ coordinatorV23: undefined }), null);

    expect(() => coordinator.onModuleInit()).toThrow('Missing coordinator address for coordinatorV23');
  });
});
