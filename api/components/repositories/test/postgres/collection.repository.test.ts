import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Equal, In, IsNull, Not } from 'typeorm';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import {
  Collection,
  CollectionRepository,
  CollectionStats,
  TokenStandard
} from '@nftfi.api/repositories/postgres/collection';
import { createTypeormQueryBuilderMock, createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildCollectionEntity } from './collection.factory';

describe(CollectionRepository.name, () => {
  let repository: CollectionRepository;
  let mainModel: MockTypeormRepository<Collection>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionRepository,
        {
          provide: getRepositoryToken(Collection),
          useValue: createTypeormRepositoryMock<Collection>()
        }
      ]
    }).compile();

    repository = moduleRef.get(CollectionRepository);
    mainModel = moduleRef.get(getRepositoryToken(Collection));
  });

  describe(CollectionRepository.prototype.create.name, () => {
    it('creates and saves a collection', async () => {
      const draft = {
        contract: '0x123',
        tokenRangeBegin: '1',
        tokenRangeEnd: '2',
        tokenStandard: TokenStandard.ERC721,
        name: 'Collection Name',
        ranking: 1,
        whitelisted: true,
        openseaSlug: 'opensea',
        npfSlug: 'npf',
        imageUrl: 'https://example.com/collection-image.png',
        releasedAt: new Date('2022-01-01T00:00:00.000Z')
      };
      const created = buildCollectionEntity(draft as never);
      mainModel.create.mockReturnValue(created);
      mainModel.save.mockResolvedValue(created);

      const result = await repository.create(draft as never);

      expect(mainModel.create).toHaveBeenCalledWith(draft);
      expect(mainModel.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe(CollectionRepository.prototype.find.name, () => {
    it('builds query with contracts, pagination and explicit sort', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      const rows = [buildCollectionEntity()];
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      mainModel.metadata.findColumnWithPropertyName.mockImplementation((name: string) => ({
        propertyName: name
      }));
      qb.getMany.mockResolvedValue(rows);

      const result = await repository.find(
        { contracts: ['0xabc'] },
        { skip: 5, limit: 10, sort: { by: 'ranking', direction: 'DESC' } }
      );

      expect(mainModel.createQueryBuilder).toHaveBeenCalledWith('collections');
      expect(qb.andWhere).toHaveBeenCalledWith('collections.contract IN (:...contracts)', { contracts: ['0xabc'] });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.addOrderBy).toHaveBeenCalledWith('collections.ranking', 'DESC', 'NULLS LAST');
      expect(result).toEqual(rows);
    });

    it('defaults to releasedAt ASC when sort is not provided', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      mainModel.metadata.findColumnWithPropertyName.mockImplementation((name: string) => ({
        propertyName: name
      }));
      qb.getMany.mockResolvedValue([]);

      await repository.find({}, { skip: 0, limit: 20 });

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.addOrderBy).toHaveBeenCalledWith('collections.releasedAt', 'ASC', 'NULLS LAST');
    });

    it('does not apply skip/take when pagination options are not provided', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      mainModel.metadata.findColumnWithPropertyName.mockImplementation((name: string) => ({
        propertyName: name
      }));
      qb.getMany.mockResolvedValue([]);

      await repository.find({});

      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();
      expect(qb.addOrderBy).toHaveBeenCalledWith('collections.releasedAt', 'ASC', 'NULLS LAST');
    });
  });

  describe(CollectionRepository.prototype.findByContract.name, () => {
    it('finds by contract', async () => {
      const rows = [buildCollectionEntity({ contract: '0xabc' })];
      mainModel.find.mockResolvedValue(rows);

      const result = await repository.findByContract('0xabc');

      expect(mainModel.find).toHaveBeenCalledWith({ where: { contract: '0xabc' } });
      expect(result).toEqual(rows);
    });
  });

  describe(CollectionRepository.prototype.findByBorrower.name, () => {
    it('builds borrower query with pagination options', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      const rows = [buildCollectionEntity({ id: 9 })];
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue(rows);

      const result = await repository.findByBorrower('0xborrower', {}, { skip: 10, limit: 20 });

      expect(mainModel.createQueryBuilder).toHaveBeenCalledWith('collections');
      expect(qb.innerJoin).toHaveBeenNthCalledWith(
        1,
        'collection_assets',
        'assets',
        'assets.collection_id = collections.id'
      );
      expect(qb.innerJoin).toHaveBeenNthCalledWith(
        2,
        'market_loans',
        'market_active_loans',
        expect.stringContaining(`market_active_loans.status = 'active'`)
      );
      const marketLoansJoin = qb.innerJoin.mock.calls[1][2] as string;
      expect(marketLoansJoin).toContain('market_active_loans.asset_id = assets.id');
      expect(marketLoansJoin).not.toContain('nft_contract');
      expect(marketLoansJoin).not.toContain('nft_token_id');
      expect(qb.andWhere).toHaveBeenCalledWith('market_active_loans.borrower = :borrower', { borrower: '0xborrower' });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual(rows);
    });

    it('applies protocols filter when provided', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);

      await repository.findByBorrower(
        '0xborrower',
        { protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade] },
        { skip: 0, limit: 10 }
      );

      expect(qb.andWhere).toHaveBeenNthCalledWith(2, 'market_active_loans.protocol IN (:...protocols)', {
        protocols: [MarketLoanProtocol.Nftfi, MarketLoanProtocol.Arcade]
      });
    });

    it('does not apply skip/take for borrower query when options are missing', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getMany.mockResolvedValue([]);

      await repository.findByBorrower('0xborrower');

      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();
    });
  });

  describe(CollectionRepository.prototype.countByBorrower.name, () => {
    it('counts distinct collections by borrower', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(4);

      const result = await repository.countByBorrower('0xborrower');

      expect(mainModel.createQueryBuilder).toHaveBeenCalledWith('collections');
      expect(qb.andWhere).toHaveBeenCalledWith('market_active_loans.borrower = :borrower', { borrower: '0xborrower' });
      expect(result).toBe(4);
    });

    it('applies protocols filter for borrower count', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(2);

      const result = await repository.countByBorrower('0xborrower', { protocols: [MarketLoanProtocol.Nftfi] });

      expect(qb.andWhere).toHaveBeenNthCalledWith(2, 'market_active_loans.protocol IN (:...protocols)', {
        protocols: [MarketLoanProtocol.Nftfi]
      });
      expect(result).toBe(2);
    });
  });

  describe(CollectionRepository.prototype.iterate.name, () => {
    it('yields entries from paginated find calls', async () => {
      const c1 = buildCollectionEntity({ id: 1 });
      const c2 = buildCollectionEntity({ id: 2, contract: '0x456' });
      const fnFind = jest.spyOn(repository, 'find').mockResolvedValueOnce([c1, c2]);

      const result: Collection[] = [];
      for await (const row of repository.iterate(
        { contracts: ['0x123'] },
        { sort: { by: 'releasedAt', direction: 'ASC' } }
      )) {
        result.push(row);
      }

      expect(result).toEqual([c1, c2]);
      expect(fnFind).toHaveBeenCalledWith(
        { contracts: ['0x123'] },
        { sort: { by: 'releasedAt', direction: 'ASC' }, skip: 0, limit: 100 }
      );
    });
  });

  describe(CollectionRepository.prototype.iterateOverNonEmptyImageEntries.name, () => {
    it('iterates collections with non-empty image urls', async () => {
      const c1 = buildCollectionEntity({ id: 1, imageUrl: 'https://example.com/a.png' });
      mainModel.find.mockResolvedValueOnce([c1]);

      const result: Collection[] = [];
      for await (const row of repository.iterateOverNonEmptyImageEntries()) {
        result.push(row);
      }

      expect(result).toEqual([c1]);
      expect(mainModel.find).toHaveBeenCalledWith({
        where: { imageUrl: Not(IsNull()) },
        order: { releasedAt: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });

  describe(CollectionRepository.prototype.iterateOverEmptyImageEntries.name, () => {
    it('iterates collections with empty image urls', async () => {
      const c1 = buildCollectionEntity({ id: 2, imageUrl: '' });
      mainModel.find.mockResolvedValueOnce([c1]);

      const result: Collection[] = [];
      for await (const row of repository.iterateOverEmptyImageEntries()) {
        result.push(row);
      }

      expect(result).toEqual([c1]);
      expect(mainModel.find).toHaveBeenCalledWith({
        where: { imageUrl: IsNull() },
        order: { releasedAt: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });

  describe(CollectionRepository.prototype.iterateOverEntriesWithNpfSlug.name, () => {
    it('iterates collections that have npfSlug', async () => {
      const c1 = buildCollectionEntity({ id: 3, npfSlug: 'slug-1' });
      mainModel.find.mockResolvedValueOnce([c1]);

      const result: Collection[] = [];
      for await (const row of repository.iterateOverEntriesWithNpfSlug()) {
        result.push(row);
      }

      expect(result).toEqual([c1]);
      expect(mainModel.find).toHaveBeenCalledWith({
        where: { npfSlug: Not(Equal(null)) },
        order: { releasedAt: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });

  describe(CollectionRepository.prototype.iterateOverEntriesWithEmptyNpfSlug.name, () => {
    it('iterates collections that have empty npfSlug', async () => {
      const c1 = buildCollectionEntity({ id: 4, npfSlug: null });
      mainModel.find.mockResolvedValueOnce([c1]);

      const result: Collection[] = [];
      for await (const row of repository.iterateOverEntriesWithEmptyNpfSlug()) {
        result.push(row);
      }

      expect(result).toEqual([c1]);
      expect(mainModel.find).toHaveBeenCalledWith({
        where: { npfSlug: Equal(null) },
        order: { releasedAt: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });

  describe(CollectionRepository.prototype.count.name, () => {
    it('counts using built query filters', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(7);

      const result = await repository.count({ contracts: ['0xabc'] });

      expect(qb.andWhere).toHaveBeenCalledWith('collections.contract IN (:...contracts)', { contracts: ['0xabc'] });
      expect(result).toBe(7);
    });

    it('counts with empty conditions when no filters provided', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(0);

      const result = await repository.count({});

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('counts with whitelisted, ids and loan stats filters', async () => {
      const qb = createTypeormQueryBuilderMock<Collection>();
      const filters = {
        whitelisted: true,
        ids: [11, 22],
        loanTotalUsdMin: 100,
        loanTotalUsdMax: 500,
        loanAvgUsdMin: 10,
        loanAvgUsdMax: 50
      };
      mainModel.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(3);

      const result = await repository.count(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('collections.whitelisted = :whitelisted', { whitelisted: true });
      expect(qb.andWhere).toHaveBeenCalledWith('collections.id IN (:...ids)', { ids: [11, 22] });
      expect(qb.innerJoin).toHaveBeenCalledWith(CollectionStats, 'stats', 'stats.collectionId = collections.id');
      expect(qb.andWhere).toHaveBeenCalledWith('stats.totalUsd >= :loanTotalUsdMin', filters);
      expect(qb.andWhere).toHaveBeenCalledWith('stats.totalUsd <= :loanTotalUsdMax', filters);
      expect(qb.andWhere).toHaveBeenCalledWith('stats.averageUsd >= :loanAvgUsdMin', filters);
      expect(qb.andWhere).toHaveBeenCalledWith('stats.averageUsd <= :loanAvgUsdMax', filters);
      expect(result).toBe(3);
    });
  });

  describe(CollectionRepository.prototype.updateByIds.name, () => {
    it('updates by ids using In operator', async () => {
      await repository.updateByIds([1, 2], { ranking: 10 });

      expect(mainModel.update).toHaveBeenCalledWith({ id: In([1, 2]) }, { ranking: 10 });
    });
  });
});
