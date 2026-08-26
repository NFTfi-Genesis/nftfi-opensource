import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoreThan } from 'typeorm';
import {
  CollectionFloorPrice,
  CollectionFloorPriceRepository
} from '@nftfi.api/repositories/postgres/collection-floor-price';
import { Collection } from '@nftfi.api/repositories/postgres/collection';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildCollectionFloorPriceEntity } from './collection-floor-price.factory';

describe(CollectionFloorPriceRepository.name, () => {
  let repository: CollectionFloorPriceRepository;
  let model: MockTypeormRepository<CollectionFloorPrice>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionFloorPriceRepository,
        {
          provide: getRepositoryToken(CollectionFloorPrice),
          useValue: createTypeormRepositoryMock<CollectionFloorPrice>()
        }
      ]
    }).compile();

    repository = moduleRef.get(CollectionFloorPriceRepository);
    model = moduleRef.get(getRepositoryToken(CollectionFloorPrice));
  });

  describe(CollectionFloorPriceRepository.prototype.create.name, () => {
    it('creates and saves floor prices', async () => {
      const draft = [
        {
          collection: { id: 1 },
          valueEth: 1,
          valueUsd: 2000,
          createdAt: new Date('2024-01-01T00:00:00.000Z')
        }
      ];
      const created = draft as never;
      const saved = [
        buildCollectionFloorPriceEntity({ collection: { id: 1 } as Collection, valueEth: 1, valueUsd: 2000 })
      ];
      model.create.mockReturnValue(created);
      model.save.mockResolvedValue(saved as never);

      const result = await repository.create(draft as never);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });
  });

  describe(CollectionFloorPriceRepository.prototype.findLatestByCollectionId.name, () => {
    it('finds latest floor price by collection id', async () => {
      const entry = buildCollectionFloorPriceEntity({ collection: { id: 7 } as Collection });
      model.findOne.mockResolvedValue(entry);

      const result = await repository.findLatestByCollectionId(7);

      expect(model.findOne).toHaveBeenCalledWith({
        where: { collection: { id: 7 } },
        order: { createdAt: 'DESC' }
      });
      expect(result).toBe(entry);
    });
  });

  describe(CollectionFloorPriceRepository.prototype.findLatestByCollectionIds.name, () => {
    it('returns empty result for empty collection ids', async () => {
      const result = await repository.findLatestByCollectionIds([]);

      expect(model.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('queries latest floor prices by joining max(created_at) subquery', async () => {
      const rows = [buildCollectionFloorPriceEntity({ collection: { id: 1 } as Collection })];
      const subQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('SELECT latest.collection_id, MAX(latest.created_at) AS created_at'),
        getParameters: jest.fn().mockReturnValue({ collectionIds: [1, 2] })
      };
      const mainQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rows)
      };
      model.createQueryBuilder
        .mockReturnValueOnce(subQueryBuilder as never)
        .mockReturnValueOnce(mainQueryBuilder as never);

      const result = await repository.findLatestByCollectionIds([1, 2]);

      expect(model.createQueryBuilder).toHaveBeenNthCalledWith(1, 'latest');
      expect(subQueryBuilder.select).toHaveBeenCalledWith('latest.collection_id', 'collection_id');
      expect(subQueryBuilder.addSelect).toHaveBeenCalledWith('MAX(latest.created_at)', 'created_at');
      expect(subQueryBuilder.where).toHaveBeenCalledWith('latest.collection_id IN (:...collectionIds)', {
        collectionIds: [1, 2]
      });
      expect(subQueryBuilder.groupBy).toHaveBeenCalledWith('latest.collection_id');
      expect(model.createQueryBuilder).toHaveBeenNthCalledWith(2, 'cfp');
      expect(mainQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('cfp.collection', 'collection');
      expect(mainQueryBuilder.innerJoin).toHaveBeenCalledWith(
        '(SELECT latest.collection_id, MAX(latest.created_at) AS created_at)',
        'latest',
        'latest.collection_id = cfp.collection_id AND latest.created_at = cfp.created_at'
      );
      expect(mainQueryBuilder.setParameters).toHaveBeenCalledWith({ collectionIds: [1, 2] });
      expect(mainQueryBuilder.orderBy).toHaveBeenCalledWith('cfp.created_at', 'DESC');
      expect(result).toEqual(rows);
    });
  });

  describe(CollectionFloorPriceRepository.prototype.iterateByCollectionIdAfterDate.name, () => {
    it('iterates floor prices for a collection in ascending createdAt order', async () => {
      const entry = buildCollectionFloorPriceEntity({ collection: { id: 9 } as Collection });
      model.find.mockResolvedValueOnce([entry]);

      const result: CollectionFloorPrice[] = [];
      for await (const row of repository.iterateByCollectionIdAfterDate(9, new Date(0))) {
        result.push(row);
      }

      expect(result).toEqual([entry]);
      expect(model.find).toHaveBeenCalledWith({
        where: { collection: { id: 9 }, createdAt: MoreThan(new Date(0)) },
        order: { createdAt: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });
});
