import { Test, TestingModule } from '@nestjs/testing';
import {
  MarketLoanAnalyticsRepository,
  type SummaryItem,
  type StatsByWalletItem
} from '@nftfi.api/repositories/postgres/market-loan';
import { AnalyticsV1Service } from '../src/analytics-v1/analytics-v1.service';
import { AnalyticsV1PaginatedQueryDto, StatsByBorrowerQueryDto, StatsByLenderQueryDto } from '../src/analytics-v1/dtos';

const emptySummaryItem = (): SummaryItem => ({
  totalUsdValue: 0,
  totalRepaymentUsd: 0,
  avgUsdValue: 0,
  avgApr: 0,
  weightedAvgApr: 0,
  weightedAvgDuration: 0,
  loanCount: 0,
  lendedLoansCount: 0,
  borrowedLoansCount: 0,
  totalEthValueOfEthLoans: 0,
  totalUsdValueOfUsdLoans: 0,
  totalInterestEthOfEthLoans: 0,
  totalInterestUsdOfUsdLoans: 0,
  totalPrincipalEthOfEthLoans: 0,
  totalPrincipalUsdOfUsdLoans: 0
});

const emptyStatsByWallet = (): StatsByWalletItem => ({
  wallet: '',
  lenderLoansCount: 0,
  borrowerLoansCount: 0,
  lenderTotalAmountUsd: 0,
  borrowerTotalAmountUsd: 0
});

type AnalyticsRepositoryTestDouble = Pick<
  MarketLoanAnalyticsRepository,
  | 'getProtocolBreakdown'
  | 'getCurrencyBreakdown'
  | 'countStatsByBorrower'
  | 'getStatsByBorrower'
  | 'countStatsByLender'
  | 'getStatsByLender'
  | 'getSummary'
  | 'getStatsByDay'
  | 'countStatsByCollection'
  | 'getStatsByCollection'
  | 'getStatsByWallet'
>;

function createMarketLoanAnalyticsRepositoryMock(): AnalyticsRepositoryTestDouble {
  return {
    getProtocolBreakdown: jest.fn().mockResolvedValue([]),
    getCurrencyBreakdown: jest.fn().mockResolvedValue([]),
    countStatsByBorrower: jest.fn().mockResolvedValue(0),
    getStatsByBorrower: jest.fn().mockResolvedValue([]),
    countStatsByLender: jest.fn().mockResolvedValue(0),
    getStatsByLender: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue(emptySummaryItem()),
    getStatsByDay: jest.fn().mockResolvedValue([]),
    countStatsByCollection: jest.fn().mockResolvedValue(0),
    getStatsByCollection: jest.fn().mockResolvedValue([]),
    getStatsByWallet: jest.fn().mockResolvedValue(emptyStatsByWallet())
  };
}

describe(AnalyticsV1Service.name, () => {
  let moduleRef: TestingModule;
  let service: AnalyticsV1Service;
  let analyticsRepository: AnalyticsRepositoryTestDouble;

  beforeEach(async () => {
    jest.resetAllMocks();

    analyticsRepository = createMarketLoanAnalyticsRepositoryMock();

    moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsV1Service,
        {
          provide: MarketLoanAnalyticsRepository,
          useValue: analyticsRepository as unknown as MarketLoanAnalyticsRepository
        }
      ]
    }).compile();

    service = moduleRef.get(AnalyticsV1Service);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe(AnalyticsV1Service.prototype.getStatsByBorrower.name, () => {
    it('falls back to page=1 and limit=100 when query values are falsy', async () => {
      const query = Object.assign(new StatsByBorrowerQueryDto(), { page: 0, limit: 0 });

      await service.getStatsByBorrower(query);

      expect(analyticsRepository.getStatsByBorrower).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        { page: 0, pageSize: 100, sortBy: undefined, sortOrder: 'DESC' }
      );
    });
  });

  describe(AnalyticsV1Service.prototype.getStatsByLender.name, () => {
    it('falls back to page=1 and limit=100 when query values are falsy', async () => {
      const query = Object.assign(new StatsByLenderQueryDto(), { page: 0, limit: 0 });

      await service.getStatsByLender(query);

      expect(analyticsRepository.getStatsByLender).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        { page: 0, pageSize: 100, sortBy: undefined, sortOrder: 'DESC' }
      );
    });
  });

  describe(AnalyticsV1Service.prototype.getStatsByCollection.name, () => {
    it('falls back to page=1 and limit=100 when query values are falsy', async () => {
      const query = Object.assign(new AnalyticsV1PaginatedQueryDto(), { page: 0, limit: 0 });

      await service.getStatsByCollection(query);

      expect(analyticsRepository.getStatsByCollection).toHaveBeenCalledWith(
        {
          daysFromNow: undefined,
          protocols: undefined,
          currencies: undefined,
          wallets: undefined,
          lender: undefined,
          borrower: undefined,
          collectionIds: undefined
        },
        { page: 0, pageSize: 100 }
      );
    });
  });
});
