import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { And, Brackets, Equal, In, IsNull, LessThan, LessThanOrEqual, Not } from 'typeorm';
import { SupportedCurrencies } from '@nftfi.api/core';
import {
  MarketLoan,
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import { FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { createTypeormQueryBuilderMock, createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildPostgresMarketLoan } from './market-loan.factory';

describe(MarketLoanRepository.name, () => {
  let repository: MarketLoanRepository;
  let model: MockTypeormRepository<MarketLoan>;
  let supportedCurrencies: { getByTicker: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MarketLoanRepository,
        {
          provide: getRepositoryToken(MarketLoan),
          useValue: createTypeormRepositoryMock<MarketLoan>()
        },
        {
          provide: SupportedCurrencies,
          useValue: { getByTicker: jest.fn() }
        },
        { provide: FxRateConfigToken, useValue: { ethusdt: 2000 } }
      ]
    }).compile();

    repository = moduleRef.get(MarketLoanRepository);
    model = moduleRef.get(getRepositoryToken(MarketLoan));
    supportedCurrencies = moduleRef.get(SupportedCurrencies);
  });

  describe(MarketLoanRepository.prototype.upsert.name, () => {
    it('updates existing loans by contract and loanId', async () => {
      const loan = buildPostgresMarketLoan({ contract: '0xabc', loanId: '99' });
      model.findOne.mockResolvedValue(loan);
      model.findOneOrFail.mockResolvedValue(loan);

      const result = await repository.upsert(loan);

      expect(model.update).toHaveBeenCalledWith({ contract: '0xabc', loanId: '99' }, loan);
      expect(model.findOneOrFail).toHaveBeenCalledWith({ where: { contract: '0xabc', loanId: '99' } });
      expect(result).toBe(loan);
    });

    it('saves new loans when no match exists', async () => {
      const loan = buildPostgresMarketLoan({ contract: '0xdef', loanId: '100' });
      const created = { ...loan };
      model.findOne.mockResolvedValue(null);
      model.create.mockReturnValue(created);
      model.save.mockResolvedValue(created);

      const result = await repository.upsert(loan);

      expect(model.create).toHaveBeenCalledWith(loan);
      expect(model.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe(MarketLoanRepository.prototype.updateByKey.name, () => {
    it('updates and returns the latest entity', async () => {
      const loan = buildPostgresMarketLoan({ contract: '0xabc', loanId: '55' });
      model.findOneOrFail.mockResolvedValue(loan);

      const result = await repository.updateByKey('0xabc', '55', { status: MarketLoanStatus.Repaid });

      expect(model.update).toHaveBeenCalledWith(
        { contract: '0xabc', loanId: '55' },
        { status: MarketLoanStatus.Repaid }
      );
      expect(model.findOneOrFail).toHaveBeenCalledWith({ where: { contract: '0xabc', loanId: '55' } });
      expect(result).toBe(loan);
    });
  });

  describe(MarketLoanRepository.prototype.updateByIds.name, () => {
    it('updates by ids only', async () => {
      await repository.updateByIds([1, 2], { status: MarketLoanStatus.Defaulted });

      expect(model.update).toHaveBeenCalledWith([1, 2], { status: MarketLoanStatus.Defaulted });
    });
  });

  describe(MarketLoanRepository.prototype.findByKey.name, () => {
    it('returns a loan by contract/tokenId', async () => {
      const loan = buildPostgresMarketLoan();
      model.findOne.mockResolvedValue(loan);

      const result = await repository.findByKey('0xcontract', '1');

      expect(model.findOne).toHaveBeenCalledWith({ where: { contract: '0xcontract', loanId: '1' } });
      expect(result).toBe(loan);
    });
  });

  describe(MarketLoanRepository.prototype.find.name, () => {
    it('builds filters and default sort columns', async () => {
      const qb = createTypeormQueryBuilderMock();
      const dueAtBefore = new Date('2024-02-01T00:00:00.000Z');
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'startedAt' });
      qb.getMany.mockResolvedValue([buildPostgresMarketLoan()]);

      const result = await repository.find(
        { statuses: [MarketLoanStatus.Active], borrower: '0xBorrower', dueAtBefore },
        { skip: 1, limit: 2, sort: { by: 'startedAt', direction: 'DESC' } }
      );

      expect(model.createQueryBuilder).toHaveBeenCalledWith('mloans');
      expect(qb.where).toHaveBeenCalledWith({
        status: In([MarketLoanStatus.Active]),
        dueAt: LessThanOrEqual(dueAtBefore),
        borrower: Equal('0xBorrower')
      });
      expect(qb.skip).toHaveBeenCalledWith(1);
      expect(qb.take).toHaveBeenCalledWith(2);
      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans.startedAt', 'DESC', 'NULLS LAST');
      expect(qb.addSelect).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('defaults to startedAt sort and ASC direction when sort is undefined', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'startedAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find({ statuses: [MarketLoanStatus.Active] }, { skip: 0, limit: 10 });

      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans.startedAt', 'ASC', 'NULLS LAST');
    });

    it('sorts by computed usd values for principal', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);
      supportedCurrencies.getByTicker.mockReturnValue({ contractAddress: '0xweth' });

      await repository.find(
        { statuses: [MarketLoanStatus.Active] },
        { skip: 0, limit: 10, sort: { by: 'principal', direction: 'ASC' } }
      );

      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('"mloans"."principal_eth" * 2000'),
        'mloans_principal_actual_usd'
      );
      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans_principal_actual_usd', 'ASC', 'NULLS LAST');
    });

    it('builds the usd selection query using WETH contract address', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);
      supportedCurrencies.getByTicker.mockReturnValue({ contractAddress: '0xweth' });

      await repository.find(
        { statuses: [MarketLoanStatus.Active] },
        { skip: 0, limit: 10, sort: { by: 'principal', direction: 'ASC' } }
      );

      expect(supportedCurrencies.getByTicker).toHaveBeenCalledWith('wETH');
      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('"mloans"."currency" = \'0xweth\''),
        'mloans_principal_actual_usd'
      );
    });

    it('sorts by computed usd values for repayment', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);
      supportedCurrencies.getByTicker.mockReturnValue({ contractAddress: '0xweth' });

      await repository.find(
        { statuses: [MarketLoanStatus.Active] },
        { skip: 0, limit: 10, sort: { by: 'repayment', direction: 'DESC' } }
      );

      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('"mloans"."repayment_eth" * 2000'),
        'mloans_repayment_actual_usd'
      );
      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans_repayment_actual_usd', 'DESC', 'NULLS LAST');
    });

    it('sorts by computed usd values for repaymentMax', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);
      supportedCurrencies.getByTicker.mockReturnValue({ contractAddress: '0xweth' });

      await repository.find(
        { statuses: [MarketLoanStatus.Active] },
        { skip: 0, limit: 10, sort: { by: 'repaymentMax', direction: 'ASC' } }
      );

      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('"mloans"."repayment_max_eth" * 2000'),
        'mloans_repaymentmax_actual_usd'
      );
      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans_repaymentmax_actual_usd', 'ASC', 'NULLS LAST');
    });

    it('expands wallets filter into a bracketed lender-or-borrower clause', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'startedAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find(
        { wallets: ['0xABCDEF', '0x123456'] },
        { skip: 0, limit: 5, sort: { by: 'startedAt', direction: 'ASC' } }
      );

      expect(qb.where).toHaveBeenCalledWith({});
      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      const bracketsArg = qb.andWhere.mock.calls[0][0] as Brackets;
      expect(bracketsArg).toBeInstanceOf(Brackets);

      const inner = createTypeormQueryBuilderMock();
      bracketsArg.whereFactory(inner as never);
      expect(inner.where).toHaveBeenCalledWith({ lender: In(['0xabcdef', '0x123456']) });
      expect(inner.orWhere).toHaveBeenCalledWith({ borrower: In(['0xabcdef', '0x123456']) });
    });

    it('sorts by collectionName via collection joins', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);

      await repository.find(
        { statuses: [MarketLoanStatus.Active] },
        { skip: 0, limit: 10, sort: { by: 'collectionName' as never, direction: 'ASC' } }
      );

      expect(qb.leftJoin).toHaveBeenCalledWith('mloans.asset', 'sort_assets');
      expect(qb.leftJoin).toHaveBeenCalledWith(
        'collections',
        'sort_collections',
        'sort_collections.id = sort_assets.collection_id'
      );
      expect(qb.addSelect).toHaveBeenCalledWith('sort_collections.name', 'mloans_collection_name');
      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans_collection_name', 'ASC', 'NULLS LAST');
    });

    it('applies nftIds filter using In clause on nftTokenId', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'startedAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find(
        { nftIds: ['123', '456'] },
        { skip: 0, limit: 10, sort: { by: 'startedAt', direction: 'ASC' } }
      );

      expect(qb.where).toHaveBeenCalledWith({ nftTokenId: In(['123', '456']) });
    });

    it('applies currencies and protocols with collectionIds filtering in joined query', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'startedAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find(
        {
          statuses: [MarketLoanStatus.Active],
          currencies: ['0xcurrency'],
          protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade],
          collectionIds: [533]
        },
        { skip: 0, limit: 25, sort: { by: 'startedAt', direction: 'ASC' } }
      );

      expect(qb.innerJoin).toHaveBeenCalledWith('mloans.asset', 'assets');
      expect(qb.where).toHaveBeenCalledWith({
        status: In([MarketLoanStatus.Active]),
        currency: In(['0xcurrency']),
        protocol: In([MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade])
      });
      expect(qb.andWhere).toHaveBeenCalledWith('assets.collection_id IN (:...collectionIds)', { collectionIds: [533] });
    });

    it('reuses assets join for collectionName sort when collectionIds filter is present', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);
      (qb as unknown as { expressionMap: { joinAttributes: Array<{ alias: { name: string } }> } }).expressionMap = {
        joinAttributes: [{ alias: { name: 'assets' } }]
      };

      await repository.find(
        { statuses: [MarketLoanStatus.Active], collectionIds: [533] },
        { skip: 0, limit: 25, sort: { by: 'collectionName' as never, direction: 'ASC' } }
      );

      expect(qb.innerJoin).toHaveBeenCalledWith('mloans.asset', 'assets');
      expect(qb.leftJoin).not.toHaveBeenCalledWith('mloans.asset', 'sort_assets');
      expect(qb.leftJoin).toHaveBeenCalledWith(
        'collections',
        'sort_collections',
        'sort_collections.id = assets.collection_id'
      );
      expect(qb.addSelect).toHaveBeenCalledWith('sort_collections.name', 'mloans_collection_name');
      expect(qb.addOrderBy).toHaveBeenCalledWith('mloans_collection_name', 'ASC', 'NULLS LAST');
    });
  });

  describe(MarketLoanRepository.prototype.count.name, () => {
    it('counts using the query builder', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(3);

      const result = await repository.count({ lender: '0xLender' });

      expect(qb.where).toHaveBeenCalledWith({ lender: Equal('0xLender') });
      expect(result).toBe(3);
    });
  });

  describe(MarketLoanRepository.prototype.findOverdue.name, () => {
    it('filters overdue loans by status and due date', async () => {
      const now = new Date('2024-03-01T00:00:00.000Z');
      model.find.mockResolvedValue([buildPostgresMarketLoan()]);

      const result = await repository.findOverdue(MarketLoanProtocol.Nftfi, now, { skip: 5, limit: 10 });

      expect(model.find).toHaveBeenCalledWith({
        where: {
          protocol: MarketLoanProtocol.Nftfi,
          status: MarketLoanStatus.Active,
          dueAt: And(Not(IsNull()), LessThan(now))
        },
        skip: 5,
        take: 10
      });
      expect(result).toHaveLength(1);
    });
  });

  describe(MarketLoanRepository.prototype.iterateUnsettled.name, () => {
    it('streams active and defaulted loans in batches, joining the asset collection', async () => {
      const loan = buildPostgresMarketLoan({ id: 3 });
      model.find.mockResolvedValueOnce([loan]);

      const result: MarketLoan[] = [];
      for await (const entry of repository.iterateUnsettled(MarketLoanProtocol.Nftfi)) {
        result.push(entry);
      }

      expect(model.find).toHaveBeenCalledTimes(1);
      expect(model.find).toHaveBeenCalledWith({
        where: {
          protocol: MarketLoanProtocol.Nftfi,
          status: In([MarketLoanStatus.Active, MarketLoanStatus.Defaulted])
        },
        relations: ['asset', 'asset.collection'],
        order: { id: 'ASC' },
        skip: 0,
        take: 100
      });
      expect(result).toEqual([loan]);
    });
  });

  describe(MarketLoanRepository.prototype.iterateByContract.name, () => {
    it('streams all loans for a contract ordered by loanId then id', async () => {
      const loan = buildPostgresMarketLoan({ id: 5 });
      model.find.mockResolvedValueOnce([loan]);

      const result: MarketLoan[] = [];
      for await (const entry of repository.iterateByContract('0x88341d1a8F672D2780C8dC725902AAe72F143B0c')) {
        result.push(entry);
      }

      expect(model.find).toHaveBeenCalledTimes(1);
      expect(model.find).toHaveBeenCalledWith({
        where: { contract: '0x88341d1a8f672d2780c8dc725902aae72f143b0c' },
        order: { loanId: 'ASC', id: 'ASC' },
        skip: 0,
        take: 100
      });
      expect(result).toEqual([loan]);
    });
  });

  describe(MarketLoanRepository.prototype.findMaturing.name, () => {
    it('filters by protocol and due date', async () => {
      const dueAtBefore = new Date('2024-04-01T00:00:00.000Z');
      model.find.mockResolvedValue([buildPostgresMarketLoan()]);

      const result = await repository.findMaturing(MarketLoanProtocol.Arcade, dueAtBefore);

      expect(model.find).toHaveBeenCalledWith({
        where: {
          status: MarketLoanStatus.Active,
          protocol: MarketLoanProtocol.Arcade,
          dueAt: LessThanOrEqual(dueAtBefore)
        }
      });
      expect(result).toHaveLength(1);
    });
  });

  describe(MarketLoanRepository.prototype.iterateActiveByProtocol.name, () => {
    it('iterates active loans by protocol ordered by id', async () => {
      const loan = buildPostgresMarketLoan({ id: 7, protocol: MarketLoanProtocol.Gondi });
      model.find.mockResolvedValueOnce([loan]);

      const result: MarketLoan[] = [];
      for await (const entry of repository.iterateActiveByProtocol(MarketLoanProtocol.Gondi)) {
        result.push(entry);
      }

      expect(model.find).toHaveBeenCalledTimes(1);
      expect(model.find).toHaveBeenCalledWith({
        where: { status: MarketLoanStatus.Active, protocol: MarketLoanProtocol.Gondi },
        order: { id: 'ASC' },
        skip: 0,
        limit: 100
      });
      expect(result).toEqual([loan]);
    });
  });

  describe(MarketLoanRepository.prototype.iterateBorrowersByProtocol.name, () => {
    it('iterates loans by protocol and borrower set ordered by id', async () => {
      const loan = buildPostgresMarketLoan({ id: 11, protocol: MarketLoanProtocol.Nftfi, borrower: '0xborrowerA' });
      model.find.mockResolvedValueOnce([loan]);

      const result: MarketLoan[] = [];
      for await (const entry of repository.iterateBorrowersByProtocol(MarketLoanProtocol.Nftfi, ['0xborrowera'])) {
        result.push(entry);
      }

      expect(model.find).toHaveBeenCalledTimes(1);
      expect(model.find).toHaveBeenCalledWith({
        where: { protocol: MarketLoanProtocol.Nftfi, borrower: In(['0xborrowera']) },
        order: { id: 'ASC' },
        skip: 0,
        limit: 100
      });
      expect(result).toEqual([loan]);
    });
  });
});
