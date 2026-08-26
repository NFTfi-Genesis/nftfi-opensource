import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets } from 'typeorm';
import {
  MarketLoan,
  MarketLoanAnalyticsRepository,
  MarketLoanProtocol,
  AnalyticsSortBy
} from '@nftfi.api/repositories/postgres/market-loan';
import { SupportedCurrencies } from '@nftfi.api/core';
import { FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';

interface AnalyticsQbMock {
  expressionMap: {
    joinAttributes: Array<{ alias: { name: string } }>;
  };
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orWhere: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  innerJoin: jest.Mock;
  setParameter: jest.Mock;
  getRawMany: jest.Mock;
  getRawOne: jest.Mock;
}

const createAnalyticsQbMock = (): AnalyticsQbMock => {
  const qb: AnalyticsQbMock = {
    expressionMap: { joinAttributes: [] },
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockImplementation((_tableName: string, alias: string) => {
      qb.expressionMap.joinAttributes.push({ alias: { name: alias } });
      return qb;
    }),
    setParameter: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn()
  };

  return qb;
};

describe(MarketLoanAnalyticsRepository.name, () => {
  let repository: MarketLoanAnalyticsRepository;
  let model: MockTypeormRepository<MarketLoan>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MarketLoanAnalyticsRepository,
        {
          provide: getRepositoryToken(MarketLoan),
          useValue: createTypeormRepositoryMock<MarketLoan>()
        },
        {
          provide: SupportedCurrencies,
          useValue: {
            getByTicker: jest.fn().mockImplementation((ticker: string) => {
              const map: Record<string, string> = { WETH: '0xweth', DAI: '0xdai', USDC: '0xusdc' };
              return { contractAddress: map[ticker] ?? `0x${ticker.toLowerCase()}` };
            })
          }
        },
        { provide: FxRateConfigToken, useValue: { ethusdt: 2000 } }
      ]
    }).compile();

    repository = moduleRef.get(MarketLoanAnalyticsRepository);
    model = moduleRef.get(getRepositoryToken(MarketLoan));
  });

  describe(MarketLoanAnalyticsRepository.prototype.getProtocolBreakdown.name, () => {
    it('returns protocol breakdown without daysFromNow (includes perpetual loans)', async () => {
      const subQb = { where: jest.fn().mockReturnThis(), orWhere: jest.fn().mockReturnThis() };
      const qb = createAnalyticsQbMock();
      qb.andWhere.mockImplementation((arg: unknown) => {
        if (arg instanceof Brackets) (arg as Brackets).whereFactory(subQb as never);
        return qb;
      });
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { protocol: 'nftfi', total: '1500.50' },
        { protocol: 'arcade', total: '800.25' }
      ]);

      const result = await repository.getProtocolBreakdown({});

      expect(qb.select).toHaveBeenCalledWith('"ml"."protocol"', 'protocol');
      expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining('COALESCE(SUM(CASE WHEN'), 'total');
      expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining(':wethCurrency'), 'total');
      expect(qb.addSelect).toHaveBeenCalledWith(expect.not.stringContaining("'0xweth'"), 'total');
      expect(qb.setParameter).toHaveBeenCalledWith('wethCurrency', '0xweth');
      expect(qb.setParameter).toHaveBeenCalledWith('ethUsdRate', 2000);
      expect(qb.groupBy).toHaveBeenCalledWith('"ml"."protocol"');
      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."status" = :statusFilter', { statusFilter: 'active' });
      expect(subQb.where).toHaveBeenCalledWith('"ml"."due_at" > NOW()');
      expect(subQb.orWhere).toHaveBeenCalledWith('"ml"."due_at" IS NULL');
      expect(result).toEqual([
        { protocol: 'nftfi', total: 1500.5 },
        { protocol: 'arcade', total: 800.25 }
      ]);
    });

    it('applies daysFromNow filter and excludes loans without due dates', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getProtocolBreakdown({ daysFromNow: 7 });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."due_at" IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."due_at" BETWEEN NOW() AND NOW() + :daysInterval::interval', {
        daysInterval: '7 days'
      });
    });

    it('applies protocols filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getProtocolBreakdown({ protocols: [MarketLoanProtocol.Nftfi] });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."protocol" IN (:...protocolsFilter)', {
        protocolsFilter: [MarketLoanProtocol.Nftfi]
      });
    });

    it('returns 0 for non-numeric total values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([{ protocol: 'nftfi', total: 'NaN' }]);

      const result = await repository.getProtocolBreakdown({});

      expect(result).toEqual([{ protocol: 'nftfi', total: 0 }]);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getCurrencyBreakdown.name, () => {
    it('returns currency breakdown without daysFromNow', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([{ currency: '0xweth', total_usd: '5000', total_native: '2.5' }]);

      const result = await repository.getCurrencyBreakdown({});

      expect(qb.select).toHaveBeenCalledWith('"ml"."currency"', 'currency');
      expect(qb.groupBy).toHaveBeenCalledWith('"ml"."currency"');
      expect(result).toEqual([{ currency: '0xweth', totalUsd: 5000, totalNative: 2.5 }]);
    });

    it('applies daysFromNow filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getCurrencyBreakdown({ daysFromNow: 14 });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."due_at" BETWEEN NOW() AND NOW() + :daysInterval::interval', {
        daysInterval: '14 days'
      });
    });

    it('applies currencies filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getCurrencyBreakdown({ currencies: ['0xabc', '0xdef'] });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."currency" IN (:...currenciesFilter)', {
        currenciesFilter: ['0xabc', '0xdef']
      });
    });

    it('returns 0 for non-numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([{ currency: '0xweth', total_usd: 'bad', total_native: null }]);

      const result = await repository.getCurrencyBreakdown({});

      expect(result).toEqual([{ currency: '0xweth', totalUsd: 0, totalNative: 0 }]);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.countStatsByBorrower.name, () => {
    it('returns count of distinct borrowers', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: '42' });

      const result = await repository.countStatsByBorrower({});

      expect(qb.select).toHaveBeenCalledWith('COUNT(DISTINCT "ml"."borrower")', 'total');
      expect(result).toBe(42);
    });

    it('returns 0 when no rows match', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: null });

      const result = await repository.countStatsByBorrower({});

      expect(result).toBe(0);
    });

    it('returns 0 when count row is missing', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(undefined);

      const result = await repository.countStatsByBorrower({});

      expect(result).toBe(0);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getStatsByBorrower.name, () => {
    it('returns borrower breakdown with default sort', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { borrower: '0xabc', total_usd_value: '1000', avg_usd_value: '500', avg_apr: '12.5', loan_count: '2' }
      ]);

      const result = await repository.getStatsByBorrower({}, { page: 0, pageSize: 100 });

      expect(qb.select).toHaveBeenCalledWith('"ml"."borrower"', 'borrower');
      expect(qb.groupBy).toHaveBeenCalledWith('"ml"."borrower"');
      expect(qb.orderBy).toHaveBeenCalledWith('total_usd_value', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(100);
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual([
        { borrower: '0xabc', totalUsdValue: 1000, avgUsdValue: 500, avgApr: 12.5, loanCount: 2 }
      ]);
    });

    it('applies wallets filter', async () => {
      const subQb = { where: jest.fn().mockReturnThis(), orWhere: jest.fn().mockReturnThis() };
      const qb = createAnalyticsQbMock();
      qb.andWhere.mockImplementation((arg: unknown) => {
        if (arg instanceof Brackets) (arg as Brackets).whereFactory(subQb as never);
        return qb;
      });
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower({ wallets: ['0xABC', '0xDEF'] }, { page: 0, pageSize: 50 });

      expect(subQb.where).toHaveBeenCalledWith('"ml"."lender" IN (:...walletsFilter)', {
        walletsFilter: ['0xabc', '0xdef']
      });
      expect(subQb.orWhere).toHaveBeenCalledWith('"ml"."borrower" IN (:...walletsFilter)', {
        walletsFilter: ['0xabc', '0xdef']
      });
    });

    it('applies lender filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower({ lender: '0xABC' }, { page: 0, pageSize: 50 });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."lender" = :lenderFilter', {
        lenderFilter: '0xABC'
      });
    });

    it('applies borrower filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower({ borrower: '0xBORROWER' }, { page: 0, pageSize: 50 });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."borrower" = :borrowerFilter', {
        borrowerFilter: '0xBORROWER'
      });
    });

    it('applies collectionIds filter with join', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower({ collectionIds: [10, 20] }, { page: 0, pageSize: 50 });

      expect(qb.innerJoin).toHaveBeenCalledWith('ml.asset', 'ca');
      expect(qb.andWhere).toHaveBeenCalledWith('"ca"."collection_id" IN (:...collectionIdsFilter)', {
        collectionIdsFilter: [10, 20]
      });
    });

    it('sorts by address column', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.Address, sortOrder: 'ASC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('"ml"."borrower"', 'ASC');
    });

    it('sorts by avgUsdValue', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.AvgUsdValue, sortOrder: 'ASC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('avg_usd_value', 'ASC');
    });

    it('sorts by avgApr', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.AvgApr, sortOrder: 'DESC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('avg_apr', 'DESC');
    });

    it('sorts by loanCount', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.LoanCount, sortOrder: 'DESC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('loan_count', 'DESC');
    });

    it('sorts by totalUsdValue by default', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.TotalUsdValue, sortOrder: 'ASC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('total_usd_value', 'ASC');
    });

    it('applies pagination offset correctly', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByBorrower({}, { page: 2, pageSize: 25 });

      expect(qb.limit).toHaveBeenCalledWith(25);
      expect(qb.offset).toHaveBeenCalledWith(50);
    });

    it('returns 0 for non-numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { borrower: '0xabc', total_usd_value: null, avg_usd_value: 'bad', avg_apr: undefined, loan_count: 'x' }
      ]);

      const result = await repository.getStatsByBorrower({}, { page: 0, pageSize: 10 });

      expect(result).toEqual([{ borrower: '0xabc', totalUsdValue: 0, avgUsdValue: 0, avgApr: 0, loanCount: 0 }]);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.countStatsByLender.name, () => {
    it('returns count of distinct lenders', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: '18' });

      const result = await repository.countStatsByLender({});

      expect(qb.select).toHaveBeenCalledWith('COUNT(DISTINCT "ml"."lender")', 'total');
      expect(result).toBe(18);
    });

    it('returns 0 when no rows match', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: null });

      const result = await repository.countStatsByLender({});

      expect(result).toBe(0);
    });

    it('returns 0 when count row is missing', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(undefined);

      const result = await repository.countStatsByLender({});

      expect(result).toBe(0);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getStatsByLender.name, () => {
    it('returns lender breakdown with default sort', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { lender: '0xabc', total_usd_value: '2000', avg_usd_value: '1000', avg_apr: '10.5', loan_count: '4' }
      ]);

      const result = await repository.getStatsByLender({}, { page: 0, pageSize: 100 });

      expect(qb.select).toHaveBeenCalledWith('"ml"."lender"', 'lender');
      expect(qb.groupBy).toHaveBeenCalledWith('"ml"."lender"');
      expect(qb.orderBy).toHaveBeenCalledWith('total_usd_value', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(100);
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual([{ lender: '0xabc', totalUsdValue: 2000, avgUsdValue: 1000, avgApr: 10.5, loanCount: 4 }]);
    });

    it('sorts by address column', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByLender(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.Address, sortOrder: 'ASC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('"ml"."lender"', 'ASC');
    });

    it('sorts by avgUsdValue', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByLender(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.AvgUsdValue, sortOrder: 'ASC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('avg_usd_value', 'ASC');
    });

    it('sorts by avgApr', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByLender(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.AvgApr, sortOrder: 'DESC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('avg_apr', 'DESC');
    });

    it('sorts by loanCount', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByLender(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.LoanCount, sortOrder: 'DESC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('loan_count', 'DESC');
    });

    it('sorts by totalUsdValue explicitly', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByLender(
        {},
        { page: 0, pageSize: 10, sortBy: AnalyticsSortBy.TotalUsdValue, sortOrder: 'ASC' }
      );

      expect(qb.orderBy).toHaveBeenCalledWith('total_usd_value', 'ASC');
    });

    it('applies pagination offset correctly', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByLender({}, { page: 3, pageSize: 20 });

      expect(qb.limit).toHaveBeenCalledWith(20);
      expect(qb.offset).toHaveBeenCalledWith(60);
    });

    it('returns 0 for non-numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { lender: '0xabc', total_usd_value: null, avg_usd_value: 'bad', avg_apr: undefined, loan_count: 'x' }
      ]);

      const result = await repository.getStatsByLender({}, { page: 0, pageSize: 10 });

      expect(result).toEqual([{ lender: '0xabc', totalUsdValue: 0, avgUsdValue: 0, avgApr: 0, loanCount: 0 }]);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getStatsByWallet.name, () => {
    it('returns wallet stats with lender and borrower counts', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({
        wallet: '0xABC',
        lender_loans_count: '10',
        borrower_loans_count: '3',
        lender_total_amount_usd: '5000.50',
        borrower_total_amount_usd: '1200.75'
      });

      const result = await repository.getStatsByWallet('0xABC');

      expect(qb.select).toHaveBeenCalledWith(':wallet', 'wallet');
      expect(qb.setParameter).toHaveBeenCalledWith('wallet', '0xABC');
      expect(qb.setParameter).toHaveBeenCalledWith('lcWallet', '0xabc');
      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."status" = :statusFilter', { statusFilter: 'active' });
      expect(result).toEqual({
        wallet: '0xABC',
        lenderLoansCount: 10,
        borrowerLoansCount: 3,
        lenderTotalAmountUsd: 5000.5,
        borrowerTotalAmountUsd: 1200.75
      });
    });

    it('includes perpetual loans (due_at IS NULL) in wallet stats', async () => {
      const subQbs: Array<{ where: jest.Mock; orWhere: jest.Mock }> = [];
      const qb = createAnalyticsQbMock();
      qb.andWhere.mockImplementation((arg: unknown) => {
        if (arg instanceof Brackets) {
          const sub = { where: jest.fn().mockReturnThis(), orWhere: jest.fn().mockReturnThis() };
          subQbs.push(sub);
          (arg as Brackets).whereFactory(sub as never);
        }
        return qb;
      });
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({});

      await repository.getStatsByWallet('0xABC');

      const dueAtBracket = subQbs.find(sub => sub.where.mock.calls.some(c => c[0] === '"ml"."due_at" > NOW()'));
      expect(dueAtBracket).toBeDefined();
      expect(dueAtBracket!.orWhere).toHaveBeenCalledWith('"ml"."due_at" IS NULL');
    });

    it('lowercases wallet for comparison', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({
        wallet: '0xDEF',
        lender_loans_count: '0',
        borrower_loans_count: '0',
        lender_total_amount_usd: '0',
        borrower_total_amount_usd: '0'
      });

      await repository.getStatsByWallet('0xDEF');

      expect(qb.setParameter).toHaveBeenCalledWith('lcWallet', '0xdef');
    });

    it('filters by wallet as lender or borrower', async () => {
      const subQb = { where: jest.fn().mockReturnThis(), orWhere: jest.fn().mockReturnThis() };
      const qb = createAnalyticsQbMock();
      qb.andWhere.mockImplementation((arg: unknown) => {
        if (arg instanceof Brackets) (arg as Brackets).whereFactory(subQb as never);
        return qb;
      });
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(undefined);

      await repository.getStatsByWallet('0xABC');

      expect(subQb.where).toHaveBeenCalledWith('"ml"."lender" = :lcWallet');
      expect(subQb.orWhere).toHaveBeenCalledWith('"ml"."borrower" = :lcWallet');
    });

    it('returns zeros when no rows match', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(undefined);

      const result = await repository.getStatsByWallet('0xMISSING');

      expect(result).toEqual({
        wallet: '0xMISSING',
        lenderLoansCount: 0,
        borrowerLoansCount: 0,
        lenderTotalAmountUsd: 0,
        borrowerTotalAmountUsd: 0
      });
    });

    it('returns 0 for non-numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({
        wallet: '0xabc',
        lender_loans_count: 'bad',
        borrower_loans_count: null,
        lender_total_amount_usd: 'NaN',
        borrower_total_amount_usd: undefined
      });

      const result = await repository.getStatsByWallet('0xabc');

      expect(result).toEqual({
        wallet: '0xabc',
        lenderLoansCount: 0,
        borrowerLoansCount: 0,
        lenderTotalAmountUsd: 0,
        borrowerTotalAmountUsd: 0
      });
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.countStatsByCollection.name, () => {
    it('returns count of distinct collections', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: '12' });

      const result = await repository.countStatsByCollection({});

      expect(qb.innerJoin).toHaveBeenCalledTimes(2);
      expect(qb.select).toHaveBeenCalledWith('COUNT(DISTINCT "c"."id")', 'total');
      expect(result).toBe(12);
    });

    it('returns 0 when no rows match', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: null });

      const result = await repository.countStatsByCollection({});

      expect(result).toBe(0);
    });

    it('returns 0 when count row is missing', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(undefined);

      const result = await repository.countStatsByCollection({});

      expect(result).toBe(0);
    });

    it('reuses the collection asset join when collectionIds filter is provided', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({ total: '2' });

      await repository.countStatsByCollection({ collectionIds: [10, 20] });

      expect(qb.innerJoin).toHaveBeenCalledTimes(2);
      expect(qb.innerJoin).toHaveBeenCalledWith('ml.asset', 'ca');
      expect(qb.andWhere).toHaveBeenCalledWith('"ca"."collection_id" IN (:...collectionIdsFilter)', {
        collectionIdsFilter: [10, 20]
      });
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getStatsByCollection.name, () => {
    it('returns collection breakdown with default sort and pagination', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        {
          collection_id: '1',
          collection_name: 'Bored Ape',
          collection_image_url: 'https://example.com/bayc.png',
          total_usd_value: '50000',
          avg_usd_value: '25000',
          avg_apr: '15.5',
          loan_count: '10',
          percentage_of_total: '45.2'
        }
      ]);

      const result = await repository.getStatsByCollection({}, { page: 0, pageSize: 100 });

      expect(qb.innerJoin).toHaveBeenCalledTimes(2);
      expect(qb.select).toHaveBeenCalledWith('"c"."id"', 'collection_id');
      expect(qb.groupBy).toHaveBeenCalledWith('"c"."id"');
      expect(qb.orderBy).toHaveBeenCalledWith('total_usd_value', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(100);
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual([
        {
          collectionId: 1,
          collectionName: 'Bored Ape',
          collectionImageUrl: 'https://example.com/bayc.png',
          totalUsdValue: 50000,
          avgUsdValue: 25000,
          avgApr: 15.5,
          loanCount: 10,
          percentageOfTotal: 45.2
        }
      ]);
    });

    it('handles null image url', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        {
          collection_id: '2',
          collection_name: 'CryptoPunks',
          collection_image_url: null,
          total_usd_value: '30000',
          avg_usd_value: '15000',
          avg_apr: '10',
          loan_count: '5',
          percentage_of_total: '30'
        }
      ]);

      const result = await repository.getStatsByCollection({}, { page: 0, pageSize: 100 });

      expect(result[0].collectionImageUrl).toBeNull();
    });

    it('applies pagination offset correctly', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByCollection({}, { page: 2, pageSize: 20 });

      expect(qb.limit).toHaveBeenCalledWith(20);
      expect(qb.offset).toHaveBeenCalledWith(40);
    });

    it('returns 0 for non-numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        {
          collection_id: 'bad',
          collection_name: 'Test',
          collection_image_url: null,
          total_usd_value: 'NaN',
          avg_usd_value: null,
          avg_apr: undefined,
          loan_count: 'x',
          percentage_of_total: 'bad'
        }
      ]);

      const result = await repository.getStatsByCollection({}, { page: 0, pageSize: 10 });

      expect(result).toEqual([
        {
          collectionId: 0,
          collectionName: 'Test',
          collectionImageUrl: null,
          totalUsdValue: 0,
          avgUsdValue: 0,
          avgApr: 0,
          loanCount: 0,
          percentageOfTotal: 0
        }
      ]);
    });

    it('reuses the collection asset join when collectionIds filter is provided', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByCollection({ collectionIds: [10, 20] }, { page: 0, pageSize: 10 });

      expect(qb.innerJoin).toHaveBeenCalledTimes(2);
      expect(qb.innerJoin).toHaveBeenCalledWith('ml.asset', 'ca');
      expect(qb.andWhere).toHaveBeenCalledWith('"ca"."collection_id" IN (:...collectionIdsFilter)', {
        collectionIdsFilter: [10, 20]
      });
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getSummary.name, () => {
    const rawSummaryRow = {
      total_usd_value: '10000',
      total_repayment_usd: '8000',
      avg_usd_value: '500',
      avg_apr: '15.5',
      weighted_avg_apr: '14.2',
      weighted_avg_duration: '45',
      loan_count: '20',
      lended_loans_count: '0',
      borrowed_loans_count: '0',
      total_eth_value_of_eth_loans: '5.5',
      total_usd_value_of_usd_loans: '3000',
      total_interest_eth_of_eth_loans: '0.25',
      total_interest_usd_of_usd_loans: '150',
      total_principal_eth_of_eth_loans: '5.25',
      total_principal_usd_of_usd_loans: '2850'
    };

    it('returns summary and parses numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      const result = await repository.getSummary({});

      const totalUsdSelect = qb.select.mock.calls[0][0] as string;
      expect(totalUsdSelect).toContain('"ml"."repayment_max_eth"');
      expect(totalUsdSelect).toContain(':wethCurrency');
      expect(totalUsdSelect).not.toContain('"ml"."repayment_max_usd"');
      expect(qb.setParameter).toHaveBeenCalledWith('wethCurrency', '0xweth');
      expect(qb.setParameter).toHaveBeenCalledWith('ethUsdRate', 2000);
      expect(result).toEqual({
        totalUsdValue: 10000,
        totalRepaymentUsd: 8000,
        avgUsdValue: 500,
        avgApr: 15.5,
        weightedAvgApr: 14.2,
        weightedAvgDuration: 45,
        loanCount: 20,
        lendedLoansCount: 0,
        borrowedLoansCount: 0,
        totalEthValueOfEthLoans: 5.5,
        totalUsdValueOfUsdLoans: 3000,
        totalInterestEthOfEthLoans: 0.25,
        totalInterestUsdOfUsdLoans: 150,
        totalPrincipalEthOfEthLoans: 5.25,
        totalPrincipalUsdOfUsdLoans: 2850
      });
    });

    it('returns 0 for non-numeric or null values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue({
        total_usd_value: null,
        total_repayment_usd: 'bad',
        avg_usd_value: undefined,
        avg_apr: null,
        weighted_avg_apr: 'NaN',
        weighted_avg_duration: null,
        loan_count: null,
        lended_loans_count: null,
        borrowed_loans_count: null,
        total_eth_value_of_eth_loans: null,
        total_usd_value_of_usd_loans: null,
        total_interest_eth_of_eth_loans: null,
        total_interest_usd_of_usd_loans: null,
        total_principal_eth_of_eth_loans: null,
        total_principal_usd_of_usd_loans: null
      });

      const result = await repository.getSummary({});

      expect(result).toEqual({
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
    });

    it('returns 0 for every metric when summary row is missing', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(undefined);

      const result = await repository.getSummary({});

      expect(result).toEqual({
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
    });

    it('sets singleWallet parameter when lender is provided', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      await repository.getSummary({ lender: '0xabc' });

      expect(qb.setParameter).toHaveBeenCalledWith('singleWallet', '0xabc');
      expect(qb.addSelect).toHaveBeenCalledWith(
        'SUM(CASE WHEN "ml"."lender" = :singleWallet THEN 1 ELSE 0 END)',
        'lended_loans_count'
      );
      expect(qb.addSelect).toHaveBeenCalledWith(
        'SUM(CASE WHEN "ml"."borrower" = :singleWallet THEN 1 ELSE 0 END)',
        'borrowed_loans_count'
      );
    });

    it('sets singleWallet parameter when borrower is provided', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      await repository.getSummary({ borrower: '0xdef' });

      expect(qb.setParameter).toHaveBeenCalledWith('singleWallet', '0xdef');
    });

    it('sets singleWallet parameter when wallets has exactly one entry', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      await repository.getSummary({ wallets: ['0xsingle'] });

      expect(qb.setParameter).toHaveBeenCalledWith('singleWallet', '0xsingle');
    });

    it('does not set singleWallet when wallets has multiple entries', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      await repository.getSummary({ wallets: ['0xabc', '0xdef'] });

      expect(qb.setParameter).not.toHaveBeenCalledWith('singleWallet', expect.anything());
      expect(qb.addSelect).toHaveBeenCalledWith('0', 'lended_loans_count');
      expect(qb.addSelect).toHaveBeenCalledWith('0', 'borrowed_loans_count');
    });

    it('does not set singleWallet when no wallet filter is provided', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      await repository.getSummary({});

      expect(qb.setParameter).not.toHaveBeenCalledWith('singleWallet', expect.anything());
      expect(qb.addSelect).toHaveBeenCalledWith('0', 'lended_loans_count');
      expect(qb.addSelect).toHaveBeenCalledWith('0', 'borrowed_loans_count');
    });

    it('sets ethCurrencies and usdCurrencies parameters from SupportedCurrencies', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawOne.mockResolvedValue(rawSummaryRow);

      await repository.getSummary({});

      expect(qb.setParameter).toHaveBeenCalledWith('ethCurrency', '0xweth');
      expect(qb.setParameter).toHaveBeenCalledWith('usdCurrencies', ['0xdai', '0xusdc']);
    });
  });

  describe(MarketLoanAnalyticsRepository.prototype.getStatsByDay.name, () => {
    it('returns stats-by-day data grouped and ordered by day', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { due_day: '2026-04-10', total_usd_value: '5000', avg_usd_value: '2500', avg_apr: '12.5', loan_count: '2' },
        { due_day: '2026-04-11', total_usd_value: '8000', avg_usd_value: '4000', avg_apr: '15.0', loan_count: '2' }
      ]);

      const result = await repository.getStatsByDay({});

      expect(qb.select).toHaveBeenCalledWith(`DATE(("ml"."due_at" AT TIME ZONE 'UTC') AT TIME ZONE :tz)`, 'due_day');
      expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining('COALESCE(SUM(CASE WHEN'), 'total_usd_value');
      expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining('"ml"."repayment_max_eth"'), 'total_usd_value');
      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.not.stringContaining('"ml"."repayment_max_usd"'),
        'total_usd_value'
      );
      expect(qb.addSelect).toHaveBeenCalledWith(expect.stringContaining('"ml"."repayment_max_eth"'), 'avg_usd_value');
      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.not.stringContaining('"ml"."repayment_max_usd"'),
        'avg_usd_value'
      );
      expect(qb.setParameter).toHaveBeenCalledWith('wethCurrency', '0xweth');
      expect(qb.setParameter).toHaveBeenCalledWith('ethUsdRate', 2000);
      expect(qb.setParameter).toHaveBeenCalledWith('tz', 'UTC');
      expect(qb.groupBy).toHaveBeenCalledWith('due_day');
      expect(qb.orderBy).toHaveBeenCalledWith('due_day', 'ASC');
      expect(result).toEqual([
        { dueDay: '2026-04-10', totalUsdValue: 5000, avgUsdValue: 2500, avgApr: 12.5, loanCount: 2 },
        { dueDay: '2026-04-11', totalUsdValue: 8000, avgUsdValue: 4000, avgApr: 15.0, loanCount: 2 }
      ]);
    });

    it('uses provided timezone', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByDay({}, 'America/New_York');

      expect(qb.setParameter).toHaveBeenCalledWith('tz', 'America/New_York');
    });

    it('reinterprets the naive due_at as UTC before converting to the target timezone', async () => {
      // Guards the timezone-direction bug: `due_at` is TIMESTAMP WITHOUT TIME ZONE (UTC instants),
      // so the day-bucket expression must convert UTC -> :tz, not treat the naive value as :tz.
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByDay({}, 'Europe/Paris');

      expect(qb.select).toHaveBeenCalledWith(`DATE(("ml"."due_at" AT TIME ZONE 'UTC') AT TIME ZONE :tz)`, 'due_day');
      expect(qb.setParameter).toHaveBeenCalledWith('tz', 'Europe/Paris');
    });

    it('applies daysFromNow filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByDay({ daysFromNow: 7 });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."due_at" BETWEEN NOW() AND NOW() + :daysInterval::interval', {
        daysInterval: '7 days'
      });
    });

    it('applies protocols filter', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      await repository.getStatsByDay({ protocols: [MarketLoanProtocol.Nftfi] });

      expect(qb.andWhere).toHaveBeenCalledWith('"ml"."protocol" IN (:...protocolsFilter)', {
        protocolsFilter: [MarketLoanProtocol.Nftfi]
      });
    });

    it('returns 0 for non-numeric values', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([
        { due_day: '2026-04-10', total_usd_value: null, avg_usd_value: 'bad', avg_apr: undefined, loan_count: 'x' }
      ]);

      const result = await repository.getStatsByDay({});

      expect(result).toEqual([{ dueDay: '2026-04-10', totalUsdValue: 0, avgUsdValue: 0, avgApr: 0, loanCount: 0 }]);
    });

    it('returns empty array when no data', async () => {
      const qb = createAnalyticsQbMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getRawMany.mockResolvedValue([]);

      const result = await repository.getStatsByDay({});

      expect(result).toEqual([]);
    });
  });
});
