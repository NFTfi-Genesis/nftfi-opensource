import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { CollectionStats, CollectionStatsRepository } from '@nftfi.api/repositories/postgres/collection';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';

describe(CollectionStatsRepository.name, () => {
  let repository: CollectionStatsRepository;
  let model: MockTypeormRepository<CollectionStats>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionStatsRepository,
        {
          provide: getRepositoryToken(CollectionStats),
          useValue: createTypeormRepositoryMock<CollectionStats>()
        }
      ]
    }).compile();

    repository = moduleRef.get(CollectionStatsRepository);
    model = moduleRef.get(getRepositoryToken(CollectionStats));
  });

  describe(CollectionStatsRepository.prototype.findByIds.name, () => {
    it('finds stats by collection ids', async () => {
      const rows = [
        {
          collectionId: 1,
          count: 1,
          totalUsd: 10,
          averageUsd: 10,
          averageApr: 1,
          averageDuration: 1,
          marketPct: 1
        } as CollectionStats
      ];
      model.find.mockResolvedValue(rows);

      const result = await repository.findByIds([1, 2]);

      expect(model.find).toHaveBeenCalledWith({ where: { collectionId: In([1, 2]) } });
      expect(result).toEqual(rows);
    });
  });
});
