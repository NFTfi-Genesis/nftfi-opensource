import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull, Not } from 'typeorm';
import { CollectionAsset, CollectionAssetRepository } from '@nftfi.api/repositories/postgres/collection-asset';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildCollectionAssetEntity } from './collection-asset.factory';

describe(CollectionAssetRepository.name, () => {
  let repository: CollectionAssetRepository;
  let model: MockTypeormRepository<CollectionAsset>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionAssetRepository,
        {
          provide: getRepositoryToken(CollectionAsset),
          useValue: createTypeormRepositoryMock<CollectionAsset>()
        }
      ]
    }).compile();

    repository = moduleRef.get(CollectionAssetRepository);
    model = moduleRef.get(getRepositoryToken(CollectionAsset));
  });

  describe(CollectionAssetRepository.prototype.create.name, () => {
    it('creates and saves asset', async () => {
      const draft = {
        collection: { id: 1 },
        contract: '0x123',
        tokenId: '1',
        name: 'Test #1',
        imageMediumUrl: 'https://example.com/image-medium.png',
        imageSmallUrl: 'https://example.com/image-small.png'
      };
      const created = buildCollectionAssetEntity(draft as never);
      model.create.mockReturnValue(created);
      model.save.mockResolvedValue(created);

      const result = await repository.create(draft as never);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.save).toHaveBeenCalledWith(created, { reload: true });
      expect(result).toBe(created);
    });
  });

  describe(CollectionAssetRepository.prototype.updateByIds.name, () => {
    it('updates by ids using In operator', async () => {
      await repository.updateByIds([1, 2], { imageSmallUrl: 'https://example.com/new-small.png' });

      expect(model.update).toHaveBeenCalledWith(
        { id: In([1, 2]) },
        { imageSmallUrl: 'https://example.com/new-small.png' }
      );
    });
  });

  describe(CollectionAssetRepository.prototype.find.name, () => {
    it('finds with filters, pagination and collection relation', async () => {
      const asset = buildCollectionAssetEntity();
      model.find.mockResolvedValue([asset]);

      const result = await repository.find({ contract: '0x123', tokenId: '1' }, { skip: 5, limit: 10 });

      expect(model.find).toHaveBeenCalledWith({
        where: { contract: '0x123', tokenId: '1' },
        skip: 5,
        take: 10,
        relations: ['collection']
      });
      expect(result).toEqual([asset]);
    });
  });

  describe(CollectionAssetRepository.prototype.findByKeys.name, () => {
    it('finds by key list with relation', async () => {
      const assets = [buildCollectionAssetEntity(), buildCollectionAssetEntity({ id: 2, tokenId: '2' })];
      model.find.mockResolvedValue(assets);

      const result = await repository.findByKeys([
        { contract: '0x123', tokenId: '1' },
        { contract: '0x123', tokenId: '2' }
      ]);

      expect(model.find).toHaveBeenCalledWith({
        where: [
          { contract: '0x123', tokenId: '1' },
          { contract: '0x123', tokenId: '2' }
        ],
        relations: ['collection']
      });
      expect(result).toEqual(assets);
    });
  });

  describe(CollectionAssetRepository.prototype.findByKey.name, () => {
    it('finds one by contract and tokenId with relation', async () => {
      const asset = buildCollectionAssetEntity();
      model.findOne.mockResolvedValue(asset);

      const result = await repository.findByKey('0x123', '1');

      expect(model.findOne).toHaveBeenCalledWith({
        where: { contract: '0x123', tokenId: '1' },
        relations: ['collection']
      });
      expect(result).toBe(asset);
    });
  });

  describe(CollectionAssetRepository.prototype.iterateOverEmptyImageEntries.name, () => {
    it('iterates assets with both image urls empty', async () => {
      const a1 = buildCollectionAssetEntity({ id: 1 });
      const a2 = buildCollectionAssetEntity({ id: 2, tokenId: '2' });
      model.find.mockResolvedValueOnce([a1, a2]).mockResolvedValueOnce([]);

      const result: CollectionAsset[] = [];
      for await (const asset of repository.iterateOverEmptyImageEntries()) {
        result.push(asset);
      }

      expect(result).toEqual([a1, a2]);
      expect(model.find).toHaveBeenNthCalledWith(1, {
        where: [{ imageSmallUrl: IsNull() }, { imageMediumUrl: IsNull() }],
        order: { id: 'ASC' },
        skip: 0,
        limit: 100
      });
      expect(model.find).toHaveBeenCalledTimes(1);
    });
  });

  describe(CollectionAssetRepository.prototype.iterateOverNonEmptyImageEntries.name, () => {
    it('iterates assets with both image urls present', async () => {
      const a1 = buildCollectionAssetEntity({ id: 3, tokenId: '3' });
      model.find.mockResolvedValueOnce([a1]).mockResolvedValueOnce([]);

      const result: CollectionAsset[] = [];
      for await (const asset of repository.iterateOverNonEmptyImageEntries()) {
        result.push(asset);
      }

      expect(result).toEqual([a1]);
      expect(model.find).toHaveBeenNthCalledWith(1, {
        where: { imageMediumUrl: Not(IsNull()), imageSmallUrl: Not(IsNull()) },
        order: { id: 'ASC' },
        skip: 0,
        limit: 100
      });
      expect(model.find).toHaveBeenCalledTimes(1);
    });
  });
});
