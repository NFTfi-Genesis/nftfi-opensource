import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FxRateRepository, FxRate } from '@nftfi.api/repositories/postgres/fx-rate';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildPostgresFxRate, createFxRateQueryBuilderMock } from './fx-rate.factory';

describe(FxRateRepository.name, () => {
  let repository: FxRateRepository;
  let model: MockTypeormRepository<FxRate>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FxRateRepository,
        {
          provide: getRepositoryToken(FxRate),
          useValue: createTypeormRepositoryMock<FxRate>()
        }
      ]
    }).compile();

    repository = moduleRef.get(FxRateRepository);
    model = moduleRef.get(getRepositoryToken(FxRate));
  });

  describe(FxRateRepository.prototype.upsert.name, () => {
    it('upserts by symbol and createdAt', async () => {
      const draft = [{ symbol: 'ETH/USD', rate: 2000, createdAt: new Date('2024-01-01T00:00:00.000Z') }];

      await repository.upsert(draft);

      expect(model.upsert).toHaveBeenCalledWith(draft, {
        conflictPaths: ['symbol', 'createdAt'],
        skipUpdateIfNoValuesChanged: true
      });
    });
  });

  describe(FxRateRepository.prototype.findLatest.name, () => {
    it('returns the latest record for a symbol', async () => {
      const rate = buildPostgresFxRate();
      model.findOne.mockResolvedValue(rate);

      const result = await repository.findLatest('ETH/USD');

      expect(model.findOne).toHaveBeenCalledWith({
        where: { symbol: 'ETH/USD' },
        order: { createdAt: 'DESC' }
      });
      expect(result).toBe(rate);
    });
  });

  describe(FxRateRepository.prototype.findToDate.name, () => {
    it('orders by nearest date then by latest timestamp', async () => {
      const qb = createFxRateQueryBuilderMock();
      qb.getOne.mockResolvedValue(buildPostgresFxRate());
      model.createQueryBuilder.mockReturnValue(qb as never);
      const date = new Date('2024-01-02T00:00:00.000Z');

      const result = await repository.findToDate('ETH/USD', date);

      expect(qb.where).toHaveBeenCalledWith('fx_rate.symbol = :symbol', { symbol: 'ETH/USD' });
      expect(qb.orderBy).toHaveBeenCalledWith('ABS(EXTRACT(EPOCH FROM (fx_rate.created_at - :date)))', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('fx_rate.created_at', 'DESC');
      expect(qb.setParameter).toHaveBeenCalledWith('date', date);
      expect(result).toBeDefined();
    });
  });

  describe(FxRateRepository.prototype.iterateDailyLatest.name, () => {
    it('yields daily latest rates', async () => {
      const rate1 = buildPostgresFxRate({ id: 1, createdAt: new Date('2024-01-01T00:00:00.000Z') });
      const rate2 = buildPostgresFxRate({ id: 2, createdAt: new Date('2024-01-02T00:00:00.000Z') });
      const qb = createFxRateQueryBuilderMock();
      qb.getMany.mockResolvedValueOnce([rate1, rate2]);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const results: FxRate[] = [];
      for await (const rate of repository.iterateDailyLatest('ETH/USD')) {
        results.push(rate);
      }

      expect(results).toEqual([rate1, rate2]);
      expect(qb.distinctOn).toHaveBeenCalledWith(['DATE(fx_rate.created_at)']);
      expect(qb.where).toHaveBeenCalledWith('fx_rate.symbol = :symbol', { symbol: 'ETH/USD' });
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(qb.limit).toHaveBeenCalledWith(100);
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it('returns after first batch when fewer than default batch size', async () => {
      const rate = buildPostgresFxRate({ id: 3, createdAt: new Date('2024-01-03T00:00:00.000Z') });
      const qb = createFxRateQueryBuilderMock();
      qb.getMany.mockResolvedValueOnce([rate]);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const results: FxRate[] = [];
      for await (const value of repository.iterateDailyLatest('ETH/USD')) {
        results.push(value);
      }

      expect(results).toEqual([rate]);
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(qb.limit).toHaveBeenCalledWith(100);
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });
  });
});
