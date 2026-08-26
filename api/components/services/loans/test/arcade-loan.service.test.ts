import { Test } from '@nestjs/testing';
import { ContractRepository } from '@nftfi.api/modules/ethers-observer';
import {
  MarketLoan,
  MarketLoanAmounts,
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AssetDto } from '@nftfi.api/facades/assets';
import { LoanHelperService } from '../src/subscribers/loan-helper.service';
import { ArcadeLoanService } from '../src/subscribers/arcade/arcade-loan.service';
import { ArcadeLoanV2Contract } from '../src/subscribers/arcade/arcade-loan-v2.contract';
import { ArcadeLoanV3Contract } from '../src/subscribers/arcade/arcade-loan-v3.contract';
import type { OnChainLoanV2, OnChainLoanV3 } from '../src/subscribers/arcade/arcade-loan.types';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

const CONTRACT_ADDRESS = '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc';
const TX_HASH = '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477';
const LOAN_STARTED_PAYLOAD = {
  loanId: 1617,
  borrower: '0x6b175474e89094c44da98b954eedeac495271d0f',
  lender: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
};

const buildAssetDto = (overrides: Partial<AssetDto> = {}): AssetDto => ({
  id: 42,
  contract: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
  tokenId: '1111',
  owners: [],
  name: 'Asset',
  imageSmallUrl: '',
  imageMediumUrl: '',
  collection: {
    id: 1,
    contract: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
    tokenRange: '1:10000',
    tokenSupply: '10000',
    tokenStandard: TokenStandard.ERC721,
    name: 'Collection',
    ranking: 1,
    imageUrl: '',
    whitelisted: true,
    floor: null,
    stats: null
  },
  ...overrides
});

const buildAmounts = (): MarketLoanAmounts => ({
  principal: '315210000000000000',
  principalUsd: 0,
  principalEth: 0,
  repayment: '315245019933200538',
  repaymentUsd: 0,
  repaymentEth: 0,
  repaymentMax: '315245019933200538',
  repaymentMaxUsd: 0,
  repaymentMaxEth: 0,
  interest: '35019933200538',
  interestUsd: 0,
  interestEth: 0,
  originationFee: '0',
  originationFeeUsd: 0,
  originationFeeEth: 0,
  adminFee: '0',
  adminFeeUsd: 0,
  adminFeeEth: 0
});

const buildV2OnChainLoan = (): OnChainLoanV2 => ({
  loanData: {
    startDate: '1741341887',
    balance: '0',
    balancePaid: '0',
    lateFeesAccrued: '0',
    numInstallmentsPaid: 0,
    state: 0,
    terms: {
      collateralAddress: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
      collateralId: '1111',
      payableCurrency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
      principal: '315210000000000000',
      interestRate: '1111003242300000000',
      durationSecs: 86400,
      deadline: 1741428287,
      numInstallments: 1
    }
  }
});

const buildV3OnChainLoan = (): OnChainLoanV3 => ({
  loanData: {
    startDate: '1741341887',
    state: 0,
    feeSnapshot: {
      lenderDefaultFee: 500,
      lenderInterestFee: 0,
      lenderPrincipalFee: 0
    },
    terms: {
      collateralAddress: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
      collateralId: '1111',
      payableCurrency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
      principal: '315210000000000000',
      proratedInterestRate: '1111003242300000000',
      durationSecs: '86400',
      deadline: '1741428287',
      affiliateCode: '1'
    }
  }
});

describe(ArcadeLoanService.name, () => {
  let service: ArcadeLoanService;
  let loanRepositoryMock: {
    upsert: jest.MockedFunction<MarketLoanRepository['upsert']>;
    updateByKey: jest.MockedFunction<MarketLoanRepository['updateByKey']>;
  };
  let loanHelperMock: {
    getAmounts: jest.MockedFunction<LoanHelperService['getAmounts']>;
    getAsset: jest.MockedFunction<LoanHelperService['getAsset']>;
    invalidateCache: jest.MockedFunction<LoanHelperService['invalidateCache']>;
  };
  let loanContractMock: { call: jest.Mock };
  let contractRepositoryMock: { findByType: jest.Mock };

  beforeEach(async () => {
    loanContractMock = { call: jest.fn() };
    contractRepositoryMock = { findByType: jest.fn().mockReturnValue(loanContractMock) };

    loanRepositoryMock = {
      upsert: jest.fn<ReturnType<MarketLoanRepository['upsert']>, Parameters<MarketLoanRepository['upsert']>>(),
      updateByKey: jest.fn<
        ReturnType<MarketLoanRepository['updateByKey']>,
        Parameters<MarketLoanRepository['updateByKey']>
      >()
    };
    loanHelperMock = {
      getAmounts: jest.fn<ReturnType<LoanHelperService['getAmounts']>, Parameters<LoanHelperService['getAmounts']>>(),
      getAsset: jest.fn<ReturnType<LoanHelperService['getAsset']>, Parameters<LoanHelperService['getAsset']>>(),
      invalidateCache: jest
        .fn<ReturnType<LoanHelperService['invalidateCache']>, Parameters<LoanHelperService['invalidateCache']>>()
        .mockResolvedValue(undefined)
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ArcadeLoanService,
        { provide: ContractRepository, useValue: contractRepositoryMock },
        { provide: MarketLoanRepository, useValue: loanRepositoryMock },
        { provide: LoanHelperService, useValue: loanHelperMock }
      ]
    }).compile();

    service = moduleRef.get(ArcadeLoanService);
  });

  describe(ArcadeLoanService.prototype.createV2.name, () => {
    it('upserts active loan with correct fields', async () => {
      loanContractMock.call.mockResolvedValue(buildV2OnChainLoan());
      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.upsert.mockResolvedValue(new MarketLoan());

      await service.createV2(CONTRACT_ADDRESS, TX_HASH, LOAN_STARTED_PAYLOAD);

      expect(contractRepositoryMock.findByType).toHaveBeenCalledWith(ArcadeLoanV2Contract);
      expect(loanHelperMock.getAsset).toHaveBeenCalledWith(
        '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        '1111',
        `${CONTRACT_ADDRESS}#${LOAN_STARTED_PAYLOAD.loanId}`
      );
      expect(loanRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          loanId: '1617',
          contract: CONTRACT_ADDRESS,
          protocol: MarketLoanProtocol.Arcade,
          status: MarketLoanStatus.Active,
          borrower: LOAN_STARTED_PAYLOAD.borrower,
          lender: LOAN_STARTED_PAYLOAD.lender,
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          nftContract: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
          nftTokenId: '1111',
          asset: { id: 42 },
          startedTx: TX_HASH,
          startedAt: new Date('2025-03-07T10:04:47.000Z'),
          dueAt: new Date('2025-03-08T10:04:47.000Z'),
          duration: 86400,
          prorated: false
        })
      );
    });

    it('passes computed repayment and fee to getAmounts', async () => {
      // interestAmount = 315210000000000000 * 1111003242300000000 / 1e22 = 35019933200538
      // repayment = 315210000000000000 + 35019933200538 = 315245019933200538
      loanContractMock.call.mockResolvedValue(buildV2OnChainLoan());
      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.upsert.mockResolvedValue(new MarketLoan());

      await service.createV2(CONTRACT_ADDRESS, TX_HASH, LOAN_STARTED_PAYLOAD);

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: '315210000000000000',
          repayment: '0',
          repaymentMax: '315245019933200538',
          interest: '35019933200538',
          originationFee: '0',
          adminFee: '0'
        }),
        '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
        new Date('2025-03-07T10:04:47.000Z')
      );
    });

    it('throws when asset is not found', async () => {
      loanContractMock.call.mockResolvedValue(buildV2OnChainLoan());
      loanHelperMock.getAsset.mockRejectedValue(
        new Error(`Asset not found for loan ${CONTRACT_ADDRESS}#${LOAN_STARTED_PAYLOAD.loanId}`)
      );

      await expect(service.createV2(CONTRACT_ADDRESS, TX_HASH, LOAN_STARTED_PAYLOAD)).rejects.toThrow(
        `Asset not found for loan ${CONTRACT_ADDRESS}#${LOAN_STARTED_PAYLOAD.loanId}`
      );
      expect(loanRepositoryMock.upsert).not.toHaveBeenCalled();
    });
  });

  describe(ArcadeLoanService.prototype.createV3.name, () => {
    it('upserts active loan with correct fields', async () => {
      loanContractMock.call.mockResolvedValue(buildV3OnChainLoan());
      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.upsert.mockResolvedValue(new MarketLoan());

      await service.createV3(CONTRACT_ADDRESS, TX_HASH, LOAN_STARTED_PAYLOAD);

      expect(contractRepositoryMock.findByType).toHaveBeenCalledWith(ArcadeLoanV3Contract);
      expect(loanRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          loanId: '1617',
          protocol: MarketLoanProtocol.Arcade,
          status: MarketLoanStatus.Active,
          asset: { id: 42 },
          duration: 86400,
          prorated: false
        })
      );
    });

    it('uses proratedInterestRate and feeSnapshot.lenderDefaultFee', async () => {
      // lenderDefaultFee = 500, String(500) = '500'
      loanContractMock.call.mockResolvedValue(buildV3OnChainLoan());
      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.upsert.mockResolvedValue(new MarketLoan());

      await service.createV3(CONTRACT_ADDRESS, TX_HASH, LOAN_STARTED_PAYLOAD);

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          repayment: '0',
          originationFee: '500'
        }),
        expect.any(String),
        expect.any(Date)
      );
    });

    it('throws when asset is not found', async () => {
      loanContractMock.call.mockResolvedValue(buildV3OnChainLoan());
      loanHelperMock.getAsset.mockRejectedValue(
        new Error(`Asset not found for loan ${CONTRACT_ADDRESS}#${LOAN_STARTED_PAYLOAD.loanId}`)
      );

      await expect(service.createV3(CONTRACT_ADDRESS, TX_HASH, LOAN_STARTED_PAYLOAD)).rejects.toThrow(
        `Asset not found for loan ${CONTRACT_ADDRESS}#${LOAN_STARTED_PAYLOAD.loanId}`
      );
      expect(loanRepositoryMock.upsert).not.toHaveBeenCalled();
    });
  });

  describe(ArcadeLoanService.prototype.repay.name, () => {
    it('updates loan to repaid status', async () => {
      const emittedAt = new Date('2026-01-07T13:22:56.560Z');
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.repay(CONTRACT_ADDRESS, TX_HASH, emittedAt, { loanId: 1617 });

      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith(CONTRACT_ADDRESS, '1617', {
        status: MarketLoanStatus.Repaid,
        endedAt: emittedAt,
        endedTx: TX_HASH
      });
    });
  });

  describe(ArcadeLoanService.prototype.liquidate.name, () => {
    it('updates loan to liquidated status', async () => {
      const emittedAt = new Date('2026-01-07T13:22:56.560Z');
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.liquidate(CONTRACT_ADDRESS, TX_HASH, emittedAt, { loanId: 1617 });

      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith(CONTRACT_ADDRESS, '1617', {
        status: MarketLoanStatus.Liquidated,
        endedAt: emittedAt,
        endedTx: TX_HASH
      });
    });
  });
});
