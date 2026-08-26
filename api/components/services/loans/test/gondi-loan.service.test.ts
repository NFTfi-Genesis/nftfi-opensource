import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { buildContract } from '@nftfi.api/modules/ethers-observer/factories/contract.factory';
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
import { ListingsFacade } from '@nftfi.api/facades/listings';
import { LoanHelperService } from '../src/subscribers/loan-helper.service';
import { GondiLoanService } from '../src/subscribers/gondi';
import { GondiLoanContract } from '../src/subscribers/gondi/gondi-loan.contract';
import { LoanRefinancedPayload, LoanStartedPayload } from '../src/subscribers/gondi/gondi-loan.types';
import { GondiLoanMath } from '../src/subscribers/gondi/gondi-loan-math';

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {}
}));

const buildAssetDto = (overrides: Partial<AssetDto> = {}): AssetDto => ({
  id: 42,
  contract: '0xb852c6b5892256c264cc2c888ea462189154d8d7',
  tokenId: '8582',
  owners: [],
  name: 'Asset',
  imageSmallUrl: '',
  imageMediumUrl: '',
  collection: {
    id: 1,
    contract: '0xb852c6b5892256c264cc2c888ea462189154d8d7',
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

const buildMarketLoan = (overrides: Partial<MarketLoan> = {}): MarketLoan => {
  const base = new MarketLoan();
  Object.assign(base, {
    id: 1,
    loanId: '1',
    contract: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16',
    protocol: MarketLoanProtocol.Gondi,
    status: MarketLoanStatus.Active,
    asset: { id: 1 } as MarketLoan['asset'],
    borrower: '0xborrower',
    lender: '0xlender',
    currency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    nftContract: '0xb852c6b5892256c264cc2c888ea462189154d8d7',
    nftTokenId: '8582',
    principal: '3000000000',
    principalUsd: 0,
    principalEth: 0,
    repayment: '3458790616',
    repaymentUsd: 0,
    repaymentEth: 0,
    repaymentMax: '3458790616',
    repaymentMaxUsd: 0,
    repaymentMaxEth: 0,
    interest: '458790616',
    interestUsd: 0,
    interestEth: 0,
    originationFee: '50000000',
    originationFeeUsd: 0,
    originationFeeEth: 0,
    adminFee: '0',
    adminFeeUsd: 0,
    adminFeeEth: 0,
    apr: 12.05,
    eapr: 137.5619,
    duration: 3888000,
    startedAt: new Date('2025-05-27T21:27:11.000Z'),
    startedTx: '0xtxstart',
    dueAt: new Date('2025-07-11T21:27:11.000Z'),
    endedAt: undefined,
    endedTx: undefined,
    prorated: false,
    createdAt: new Date('2025-05-27T21:27:11.000Z'),
    updatedAt: new Date('2025-05-27T21:27:11.000Z')
  } satisfies MarketLoan);

  return Object.assign(base, overrides);
};

const buildStartedPayload = (overrides: Partial<LoanStartedPayload> = {}): LoanStartedPayload => ({
  loanId: '2635',
  borrower: '0xc3b25ee8ab96e695d7fe9ca7f022266d83082046',
  nftCollateralTokenId: '8582',
  nftCollateralAddress: '0xb852c6b5892256c264cc2c888ea462189154d8d7',
  principalAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  principalAmount: '3000000000',
  startTime: '1748381231',
  duration: '3888000',
  sources: [
    {
      lender: '0x86486d881b8ca7b4186d6aef4b9c8e6c30be73f0',
      principalAmount: '3000000000',
      accruedInterest: '0',
      aprBps: '1205'
    }
  ],
  feeAmount: '50000000',
  ...overrides
});

describe(GondiLoanService.name, () => {
  let service: GondiLoanService;

  let loanRepositoryMock: {
    upsert: jest.MockedFunction<MarketLoanRepository['upsert']>;
    findByKey: jest.MockedFunction<MarketLoanRepository['findByKey']>;
    updateByKey: jest.MockedFunction<MarketLoanRepository['updateByKey']>;
  };
  let loanHelperMock: {
    getAmounts: jest.MockedFunction<LoanHelperService['getAmounts']>;
    getAsset: jest.MockedFunction<LoanHelperService['getAsset']>;
    getLoanByKey: jest.MockedFunction<LoanHelperService['getLoanByKey']>;
    invalidateCache: jest.MockedFunction<LoanHelperService['invalidateCache']>;
  };

  beforeEach(async () => {
    loanRepositoryMock = {
      upsert: jest.fn<ReturnType<MarketLoanRepository['upsert']>, Parameters<MarketLoanRepository['upsert']>>(),
      findByKey: jest.fn<
        ReturnType<MarketLoanRepository['findByKey']>,
        Parameters<MarketLoanRepository['findByKey']>
      >(),
      updateByKey: jest.fn<
        ReturnType<MarketLoanRepository['updateByKey']>,
        Parameters<MarketLoanRepository['updateByKey']>
      >()
    };

    loanHelperMock = {
      getAmounts: jest.fn<ReturnType<LoanHelperService['getAmounts']>, Parameters<LoanHelperService['getAmounts']>>(),
      getAsset: jest.fn<ReturnType<LoanHelperService['getAsset']>, Parameters<LoanHelperService['getAsset']>>(),
      getLoanByKey: jest.fn<
        ReturnType<LoanHelperService['getLoanByKey']>,
        Parameters<LoanHelperService['getLoanByKey']>
      >(),
      invalidateCache: jest
        .fn<ReturnType<LoanHelperService['invalidateCache']>, Parameters<LoanHelperService['invalidateCache']>>()
        .mockResolvedValue(undefined)
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              baseDir: '/app/tmp'
            })
          ]
        })
      ],
      providers: [
        GondiLoanService,
        { provide: MarketLoanRepository, useValue: loanRepositoryMock },
        { provide: LoanHelperService, useValue: loanHelperMock },
        { provide: ContractRepository, useValue: {} },
        { provide: ListingsFacade, useValue: { deleteByNftKey: jest.fn().mockResolvedValue(undefined) } }
      ]
    }).compile();

    service = moduleRef.get(GondiLoanService);
  });

  describe(GondiLoanService.prototype.create.name, () => {
    it('upserts active loan when payload is valid', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;
      const emittedAt = new Date('2025-05-27T21:27:11.000Z');
      const payload = buildStartedPayload();
      const amounts: MarketLoanAmounts = {
        principal: payload.principalAmount,
        principalUsd: 0,
        principalEth: 0,
        repayment: '0',
        repaymentUsd: 0,
        repaymentEth: 0,
        repaymentMax: GondiLoanMath.calculateRepayment(payload),
        repaymentMaxUsd: 0,
        repaymentMaxEth: 0,
        interest: '458790616',
        interestUsd: 0,
        interestEth: 0,
        originationFee: payload.feeAmount,
        originationFeeUsd: 0,
        originationFeeEth: 0,
        adminFee: '0',
        adminFeeUsd: 0,
        adminFeeEth: 0
      };

      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());
      loanHelperMock.getAmounts.mockResolvedValue(amounts);
      loanRepositoryMock.upsert.mockResolvedValue(buildMarketLoan({ loanId: payload.loanId }));

      await service.create(contract, payload, emittedAt, '0xhash');

      expect(loanHelperMock.getAsset).toHaveBeenCalledWith(
        payload.nftCollateralAddress,
        payload.nftCollateralTokenId,
        `${contract.address}#${payload.loanId}`
      );
      expect(loanHelperMock.getAmounts).toHaveBeenCalledTimes(1);
      expect(loanRepositoryMock.upsert).toHaveBeenCalledTimes(1);
      expect(loanRepositoryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          loanId: payload.loanId,
          contract: contract.address,
          protocol: MarketLoanProtocol.Gondi,
          status: MarketLoanStatus.Active,
          borrower: payload.borrower,
          lender: payload.sources[0].lender,
          currency: payload.principalAddress,
          nftContract: payload.nftCollateralAddress,
          nftTokenId: payload.nftCollateralTokenId,
          startedTx: '0xhash',
          asset: { id: 42 }
        })
      );
    });

    it('throws when asset is missing', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;
      const payload = buildStartedPayload();

      loanHelperMock.getAsset.mockRejectedValue(
        new Error(
          `Asset not found for loan ${contract.address}#${payload.loanId}: ${payload.nftCollateralAddress}#${payload.nftCollateralTokenId}`
        )
      );

      await expect(service.create(contract, payload, new Date('2025-05-27T21:27:11.000Z'), '0xhash')).rejects.toThrow(
        `Asset not found for loan ${contract.address}#${payload.loanId}: ${payload.nftCollateralAddress}#${payload.nftCollateralTokenId}`
      );
      expect(loanRepositoryMock.upsert).not.toHaveBeenCalled();
    });

    it('does not upsert when sources are empty', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;
      const payload = buildStartedPayload({ sources: [] });

      loanHelperMock.getAsset.mockResolvedValue(buildAssetDto());

      await service.create(contract, payload, new Date('2025-05-27T21:27:11.000Z'), '0xhash');

      expect(loanRepositoryMock.upsert).not.toHaveBeenCalled();
    });
  });

  describe(GondiLoanService.prototype.refinance.name, () => {
    it('repays old loan and creates new loan', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;
      const emittedAt = new Date('2025-06-04T21:51:23.000Z');
      const oldLoan = buildMarketLoan({
        startedAt: new Date('2025-04-01T00:00:00.000Z'),
        principal: '200000000000000000',
        interest: '13623552000000000'
      });
      const payload: LoanRefinancedPayload = {
        ...buildStartedPayload(),
        oldLoanId: '5184',
        newLoanId: '6265'
      };

      loanHelperMock.getLoanByKey.mockResolvedValue(oldLoan);
      const repaySpy = jest.spyOn(service, 'repay').mockResolvedValue();
      const createSpy = jest.spyOn(service, 'create').mockResolvedValue();

      await service.refinance(contract, payload, emittedAt, '0xrefi');

      expect(loanHelperMock.getLoanByKey).toHaveBeenCalledWith(contract.address, payload.oldLoanId);
      expect(repaySpy).toHaveBeenCalledWith(
        contract,
        {
          loanId: payload.oldLoanId,
          totalRepayment: GondiLoanMath.calculateRefiRepayment(oldLoan, emittedAt)
        },
        emittedAt,
        '0xrefi'
      );
      expect(createSpy).toHaveBeenCalledWith(
        contract,
        expect.objectContaining({ loanId: payload.newLoanId, feeAmount: payload.feeAmount }),
        emittedAt,
        '0xrefi'
      );
    });
  });

  describe(GondiLoanService.prototype.repay.name, () => {
    it('updates loan with repaid status', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;
      const emittedAt = new Date('2025-07-01T00:00:00.000Z');
      const loan = buildMarketLoan({
        loanId: '1617',
        contract: contract.address,
        principal: '100000000000',
        originationFee: '0',
        duration: 864000
      });
      const amounts: MarketLoanAmounts = {
        principal: '0',
        principalUsd: 0,
        principalEth: 0,
        repayment: '142382703396',
        repaymentUsd: 0,
        repaymentEth: 0,
        repaymentMax: '0',
        repaymentMaxUsd: 0,
        repaymentMaxEth: 0,
        interest: '42382703396',
        interestUsd: 0,
        interestEth: 0,
        originationFee: '0',
        originationFeeUsd: 0,
        originationFeeEth: 0,
        adminFee: '0',
        adminFeeUsd: 0,
        adminFeeEth: 0
      };

      loanHelperMock.getLoanByKey.mockResolvedValue(loan);
      loanHelperMock.getAmounts.mockResolvedValue(amounts);
      loanRepositoryMock.updateByKey.mockResolvedValue(buildMarketLoan({ status: MarketLoanStatus.Repaid }));

      await service.repay(contract, { loanId: '1617', totalRepayment: '142382703396' }, emittedAt, '0xrepay');

      expect(loanHelperMock.getLoanByKey).toHaveBeenCalledWith(contract.address, '1617');
      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith(
        contract.address,
        '1617',
        expect.objectContaining({
          status: MarketLoanStatus.Repaid,
          endedAt: emittedAt,
          endedTx: '0xrepay'
        })
      );
    });

    it('throws when loan does not exist', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;

      loanHelperMock.getLoanByKey.mockRejectedValue(
        new Error(`Loan not found: contract=${contract.address} loanId=1617`)
      );

      await expect(
        service.repay(
          contract,
          { loanId: '1617', totalRepayment: '142382703396' },
          new Date('2025-07-01T00:00:00.000Z'),
          '0xrepay'
        )
      ).rejects.toThrow(`Loan not found: contract=0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16 loanId=1617`);
      expect(loanRepositoryMock.updateByKey).not.toHaveBeenCalled();
    });
  });

  describe(GondiLoanService.prototype.liquidate.name, () => {
    it('updates loan to liquidated status', async () => {
      const contract = buildContract({ address: '0x478f6f994c6fb3cf3e444a489b3ad9edb8ccae16' }) as GondiLoanContract;
      const emittedAt = new Date('2025-07-01T00:00:00.000Z');

      loanRepositoryMock.updateByKey.mockResolvedValue(buildMarketLoan({ status: MarketLoanStatus.Liquidated }));

      await service.liquidate(contract, { loanId: '1617' }, emittedAt, '0xliq');

      expect(loanRepositoryMock.updateByKey).toHaveBeenCalledWith(contract.address, '1617', {
        status: MarketLoanStatus.Liquidated,
        endedAt: emittedAt,
        endedTx: '0xliq'
      });
    });
  });
});
