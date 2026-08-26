import { Test } from '@nestjs/testing';
import { SupportedCurrencies } from '@nftfi.api/core';
import {
  MarketLoan,
  MarketLoanAmounts,
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { FxRateConfigToken, FxRateConfig } from '@nftfi.api/modules/fx-rate-provider';
import { buildAssetDto } from '@nftfi.api/services/assets/factories';
import { LoanHelperService } from '../src/subscribers/loan-helper.service';
import { BlurLoanService } from '../src/subscribers/blur/blur-loan.service';

jest.mock('@ethersproject/contracts', () => ({ Contract: class {} }));

const CONTRACT_ADDRESS = '0x29469395eaf6f95920e59f858042f0e28d98a20b';
const TX_HASH = '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477';
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const NFT_CONTRACT = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d';
const NFT_TOKEN_ID = '1234';
const LIEN_ID = '42';

// 20% APR: rate=2000 → calculateApr → 2000/100 = 20
// aprNormalized = 20/100 = 0.2 → compound multiplier = (1.2)^exponent
const RATE = '2000';

// 1 ETH principal
const PRINCIPAL = '1000000000000000000';

const SECONDS_PER_YEAR = 86400 * 365;

const buildAmounts = (overrides: Partial<MarketLoanAmounts> = {}): MarketLoanAmounts => ({
  principal: PRINCIPAL,
  principalUsd: 0,
  principalEth: 0,
  repayment: '0',
  repaymentUsd: 0,
  repaymentEth: 0,
  repaymentMax: PRINCIPAL,
  repaymentMaxUsd: 0,
  repaymentMaxEth: 0,
  interest: '0',
  interestUsd: 0,
  interestEth: 0,
  originationFee: '0',
  originationFeeUsd: 0,
  originationFeeEth: 0,
  adminFee: '0',
  adminFeeUsd: 0,
  adminFeeEth: 0,
  ...overrides
});

describe(BlurLoanService.name, () => {
  let service: BlurLoanService;
  let loanRepositoryMock: {
    upsert: jest.MockedFunction<MarketLoanRepository['upsert']>;
    updateByKey: jest.MockedFunction<MarketLoanRepository['updateByKey']>;
    findByKey: jest.MockedFunction<MarketLoanRepository['findByKey']>;
    iterateActiveByProtocol: jest.Mock;
  };
  let loanHelperMock: {
    getAmounts: jest.MockedFunction<LoanHelperService['getAmounts']>;
    getAsset: jest.MockedFunction<LoanHelperService['getAsset']>;
    invalidateCache: jest.MockedFunction<LoanHelperService['invalidateCache']>;
  };
  let ethersFacadeMock: { getLatestBlock: jest.Mock };
  let supportedCurrenciesMock: { getByTicker: jest.Mock };
  let fxRateConfigMock: FxRateConfig;

  beforeEach(async () => {
    loanRepositoryMock = {
      upsert: jest.fn<ReturnType<MarketLoanRepository['upsert']>, Parameters<MarketLoanRepository['upsert']>>(),
      updateByKey: jest.fn<
        ReturnType<MarketLoanRepository['updateByKey']>,
        Parameters<MarketLoanRepository['updateByKey']>
      >(),
      findByKey: jest.fn<
        ReturnType<MarketLoanRepository['findByKey']>,
        Parameters<MarketLoanRepository['findByKey']>
      >(),
      iterateActiveByProtocol: jest.fn()
    };
    loanHelperMock = {
      getAmounts: jest.fn<ReturnType<LoanHelperService['getAmounts']>, Parameters<LoanHelperService['getAmounts']>>(),
      getAsset: jest.fn<ReturnType<LoanHelperService['getAsset']>, Parameters<LoanHelperService['getAsset']>>(),
      invalidateCache: jest.fn<
        ReturnType<LoanHelperService['invalidateCache']>,
        Parameters<LoanHelperService['invalidateCache']>
      >()
    };
    ethersFacadeMock = { getLatestBlock: jest.fn() };
    supportedCurrenciesMock = {
      getByTicker: jest.fn().mockReturnValue({ contractAddress: WETH_ADDRESS })
    };
    fxRateConfigMock = { ethusdt: 3000 };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BlurLoanService,
        { provide: MarketLoanRepository, useValue: loanRepositoryMock },
        { provide: EthersFacade, useValue: ethersFacadeMock },
        { provide: LoanHelperService, useValue: loanHelperMock },
        { provide: SupportedCurrencies, useValue: supportedCurrenciesMock },
        { provide: FxRateConfigToken, useValue: fxRateConfigMock }
      ]
    }).compile();

    service = moduleRef.get(BlurLoanService);
  });

  describe(BlurLoanService.prototype.create.name, () => {
    const emittedAt = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
      lienId: LIEN_ID,
      lender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      borrower: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      loanAmount: PRINCIPAL,
      rate: RATE,
      tokenId: NFT_TOKEN_ID,
      collection: NFT_CONTRACT
    };

    it('upserts active loan with correct fields', async () => {
      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.upsert.mockResolvedValue(new MarketLoan());

      await service.create(CONTRACT_ADDRESS, TX_HASH, emittedAt, payload);

      expect(loanHelperMock.getAsset).toHaveBeenCalledWith(
        '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
        '1234',
        '0x29469395eaf6f95920e59f858042f0e28d98a20b#42'
      );
      expect(loanRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          loanId: '42',
          contract: '0x29469395eaf6f95920e59f858042f0e28d98a20b',
          protocol: MarketLoanProtocol.Blur,
          status: MarketLoanStatus.Active,
          borrower: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          lender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          nftContract: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
          nftTokenId: '1234',
          asset: { id: 1 },
          apr: 20,
          eapr: 20,
          prorated: false,
          duration: 0,
          startedAt: new Date('2026-01-01T00:00:00.000Z'),
          startedTx: '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477',
          dueAt: null
        })
      );
      expect(loanHelperMock.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('at creation repaymentMax equals principal (duration=0 → compound multiplier = 1)', async () => {
      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.upsert.mockResolvedValue(new MarketLoan());

      await service.create(CONTRACT_ADDRESS, TX_HASH, emittedAt, payload);

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: '1000000000000000000',
          repayment: '0',
          repaymentMax: '1000000000000000000', // no interest accrued at t=0
          interest: '0',
          originationFee: '0',
          adminFee: '0'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2026-01-01T00:00:00.000Z')
      );
    });

    it('throws when asset is not found and does not upsert', async () => {
      loanHelperMock.getAsset.mockRejectedValue(new Error(`Asset not found for loan ${CONTRACT_ADDRESS}#${LIEN_ID}`));

      await expect(service.create(CONTRACT_ADDRESS, TX_HASH, emittedAt, payload)).rejects.toThrow(
        'Asset not found for loan 0x29469395eaf6f95920e59f858042f0e28d98a20b#42'
      );
      expect(loanRepositoryMock.upsert).not.toHaveBeenCalled();
    });
  });

  describe(BlurLoanService.prototype.repay.name, () => {
    it('updates loan to repaid status with final amounts', async () => {
      const emittedAt = new Date('2026-06-01T00:00:00.000Z');
      const mockLoan = Object.assign(new MarketLoan(), {
        principal: '1000000000000000000',
        repaymentMax: '1200000000000000000',
        currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
      });
      loanRepositoryMock.findByKey.mockResolvedValue(mockLoan);
      loanHelperMock.getAmounts.mockResolvedValue(
        buildAmounts({
          repayment: '1200000000000000000',
          repaymentMax: '1200000000000000000',
          interest: '200000000000000000'
        })
      );
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.repay(CONTRACT_ADDRESS, TX_HASH, emittedAt, LIEN_ID);

      expect(loanRepositoryMock.findByKey).toHaveBeenCalledWith('0x29469395eaf6f95920e59f858042f0e28d98a20b', '42');
      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          repayment: '1200000000000000000',
          interest: '200000000000000000'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2026-06-01T00:00:00.000Z')
      );
      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        '42',
        expect.objectContaining({
          status: MarketLoanStatus.Repaid,
          endedAt: new Date('2026-06-01T00:00:00.000Z'),
          endedTx: '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477',
          repayment: '1200000000000000000',
          interest: '200000000000000000'
        })
      );
      expect(loanHelperMock.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('returns early without updating when loan is not found', async () => {
      loanRepositoryMock.findByKey.mockResolvedValue(null);

      await service.repay(CONTRACT_ADDRESS, TX_HASH, new Date('2026-06-01T00:00:00.000Z'), LIEN_ID);

      expect(loanRepositoryMock.updateByKey).not.toHaveBeenCalled();
      expect(loanHelperMock.invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe(BlurLoanService.prototype.refinance.name, () => {
    const emittedAt = new Date('2026-03-01T00:00:00.000Z');
    const NEW_AMOUNT = '2000000000000000000'; // 2 ETH
    const NEW_RATE = '1000'; // 10% APR
    const payload = {
      lienId: LIEN_ID,
      collection: NFT_CONTRACT,
      newLender: '0xcccccccccccccccccccccccccccccccccccccccc',
      newAmount: NEW_AMOUNT,
      newRate: NEW_RATE
    };

    it('updates loan in place with new terms (renegotiation — does not close and reopen)', async () => {
      loanRepositoryMock.findByKey.mockResolvedValue(new MarketLoan());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts({ principal: NEW_AMOUNT, repaymentMax: NEW_AMOUNT }));
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.refinance(CONTRACT_ADDRESS, emittedAt, payload);

      // Must NOT call upsert — same loan record updated in place
      expect(loanRepositoryMock.upsert).not.toHaveBeenCalled();
      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith(
        '0x29469395eaf6f95920e59f858042f0e28d98a20b',
        '42',
        expect.objectContaining({
          lender: '0xcccccccccccccccccccccccccccccccccccccccc',
          apr: 10,
          eapr: 10,
          startedAt: new Date('2026-03-01T00:00:00.000Z'),
          status: MarketLoanStatus.Active
        })
      );
      expect(loanHelperMock.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('at refinance moment repaymentMax equals newAmount (duration=0 → compound multiplier = 1)', async () => {
      // Formula: newAmount × (1 + newApr/100)^(0 / SECONDS_PER_YEAR) = newAmount × 1 = newAmount
      loanRepositoryMock.findByKey.mockResolvedValue(new MarketLoan());
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts({ principal: NEW_AMOUNT, repaymentMax: NEW_AMOUNT }));
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.refinance(CONTRACT_ADDRESS, emittedAt, payload);

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: '2000000000000000000',
          repayment: '0',
          repaymentMax: '2000000000000000000',
          interest: '0'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2026-03-01T00:00:00.000Z')
      );
    });

    it('returns early without updating when loan is not found', async () => {
      loanRepositoryMock.findByKey.mockResolvedValue(null);

      await service.refinance(CONTRACT_ADDRESS, emittedAt, payload);

      expect(loanRepositoryMock.updateByKey).not.toHaveBeenCalled();
      expect(loanHelperMock.invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe(BlurLoanService.prototype.defaulting.name, () => {
    it('sets dueAt to 36 hours after StartAuction event', async () => {
      const emittedAt = new Date('2026-05-10T12:00:00.000Z');
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.defaulting(CONTRACT_ADDRESS, TX_HASH, emittedAt, LIEN_ID);

      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith('0x29469395eaf6f95920e59f858042f0e28d98a20b', '42', {
        dueAt: new Date('2026-05-12T00:00:00.000Z')
      });
    });
  });

  describe(BlurLoanService.prototype.liquidate.name, () => {
    it('updates loan to liquidated status', async () => {
      const emittedAt = new Date('2026-05-12T12:00:00.000Z');
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.liquidate(CONTRACT_ADDRESS, TX_HASH, emittedAt, LIEN_ID);

      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith('0x29469395eaf6f95920e59f858042f0e28d98a20b', '42', {
        status: MarketLoanStatus.Liquidated,
        endedAt: new Date('2026-05-12T12:00:00.000Z'),
        endedTx: '0xe404fbda8ee2a3d5c82cf72e7d8abdce7a20bd41f821b723ef446307f6086477'
      });
      expect(loanHelperMock.invalidateCache).toHaveBeenCalledTimes(1);
    });
  });

  describe(BlurLoanService.prototype.updateAmounts.name, () => {
    const loanStartedAt = new Date('2026-01-01T00:00:00.000Z');
    const startTimestamp = Math.floor(loanStartedAt.getTime() / 1000); // 1735689600

    it('compound interest after 1 year at 20% APR: repayment = principal × 1.2', async () => {
      const blockTimestamp = startTimestamp + SECONDS_PER_YEAR;
      ethersFacadeMock.getLatestBlock.mockResolvedValue({ timestamp: blockTimestamp });
      const mockLoan = Object.assign(new MarketLoan(), {
        contract: CONTRACT_ADDRESS,
        loanId: LIEN_ID,
        principal: PRINCIPAL,
        apr: 20,
        currency: WETH_ADDRESS,
        startedAt: loanStartedAt
      });
      loanRepositoryMock.iterateActiveByProtocol.mockReturnValue(
        (async function* (): AsyncGenerator<MarketLoan> {
          yield mockLoan;
        })()
      );
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.updateAmounts();

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          repaymentMax: '1200000000000000000',
          interest: '200000000000000000'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2027-01-01T00:00:00.000Z'),
        3000
      );
      expect(loanHelperMock.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('does not invalidate cache when no active loans exist', async () => {
      const blockTimestamp = startTimestamp + SECONDS_PER_YEAR;
      ethersFacadeMock.getLatestBlock.mockResolvedValue({ timestamp: blockTimestamp });
      loanRepositoryMock.iterateActiveByProtocol.mockReturnValue(
        (async function* (): AsyncGenerator<MarketLoan> {
          // yields nothing
        })()
      );

      await service.updateAmounts();

      expect(loanRepositoryMock.updateByKey).not.toHaveBeenCalled();
      expect(loanHelperMock.invalidateCache).not.toHaveBeenCalled();
    });

    it('compound interest after 6 months at 20% APR: repayment = principal × √1.2', async () => {
      const halfYear = Math.floor(SECONDS_PER_YEAR / 2);
      const blockTimestamp = startTimestamp + halfYear;
      ethersFacadeMock.getLatestBlock.mockResolvedValue({ timestamp: blockTimestamp });
      const mockLoan = Object.assign(new MarketLoan(), {
        contract: CONTRACT_ADDRESS,
        loanId: LIEN_ID,
        principal: PRINCIPAL,
        apr: 20,
        currency: WETH_ADDRESS,
        startedAt: loanStartedAt
      });
      loanRepositoryMock.iterateActiveByProtocol.mockReturnValue(
        (async function* (): AsyncGenerator<MarketLoan> {
          yield mockLoan;
        })()
      );
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.updateAmounts();

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          repaymentMax: '1095445115010332100'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2026-07-02T12:00:00.000Z'),
        3000
      );
    });

    it('matches legacy formula for arbitrary duration and APR', async () => {
      const twoYears = SECONDS_PER_YEAR * 2;
      const blockTimestamp = startTimestamp + twoYears;
      ethersFacadeMock.getLatestBlock.mockResolvedValue({ timestamp: blockTimestamp });
      fxRateConfigMock.ethusdt = 4000;

      const mockLoan = Object.assign(new MarketLoan(), {
        contract: CONTRACT_ADDRESS,
        loanId: LIEN_ID,
        principal: '2000000000000000000', // 2 ETH
        apr: 50, // 50% APR
        currency: WETH_ADDRESS,
        startedAt: loanStartedAt
      });
      loanRepositoryMock.iterateActiveByProtocol.mockReturnValue(
        (async function* (): AsyncGenerator<MarketLoan> {
          yield mockLoan;
        })()
      );
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.updateAmounts();

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          repaymentMax: '4500000000000000000',
          interest: '2500000000000000000'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2028-01-01T00:00:00.000Z'),
        4000
      );
    });

    it('returns principal unchanged when apr is 0', async () => {
      const blockTimestamp = startTimestamp + SECONDS_PER_YEAR;
      ethersFacadeMock.getLatestBlock.mockResolvedValue({ timestamp: blockTimestamp });
      const mockLoan = Object.assign(new MarketLoan(), {
        contract: CONTRACT_ADDRESS,
        loanId: LIEN_ID,
        principal: PRINCIPAL,
        apr: 0,
        currency: WETH_ADDRESS,
        startedAt: loanStartedAt
      });
      loanRepositoryMock.iterateActiveByProtocol.mockReturnValue(
        (async function* (): AsyncGenerator<MarketLoan> {
          yield mockLoan;
        })()
      );
      loanHelperMock.getAmounts.mockResolvedValue(buildAmounts());
      loanRepositoryMock.updateByKey.mockResolvedValue(new MarketLoan());

      await service.updateAmounts();

      expect(loanHelperMock.getAmounts).toHaveBeenCalledWith(
        expect.objectContaining({
          repaymentMax: '1000000000000000000',
          interest: '0'
        }),
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        new Date('2027-01-01T00:00:00.000Z'),
        3000
      );
    });
  });
});
