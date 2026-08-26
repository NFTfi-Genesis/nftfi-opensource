import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { buildCollectionEntity } from '@nftfi.api/repositories/postgres/factories/collection';
import { buildCollectionAssetEntity } from '@nftfi.api/repositories/postgres/factories/collection-asset';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AssetDto, AssetProjection } from '@nftfi.api/facades/assets';
import { AssetService } from '../src/asset/asset.service';
import { AssetController } from '../src/asset/asset.controller';
import { AssetPipe } from '../src/asset/asset.pipe';
import { buildCollectionDto } from './factories';

jest.mock('redis-semaphore');

describe(AssetController.name, () => {
  let controller: AssetController;
  let service: AssetService;
  let app: INestApplication;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [
        {
          provide: AssetService,
          useValue: {
            getByKey: jest.fn(),
            getByKeys: jest.fn(),
            getMany: jest.fn(),
            toDto: jest.fn(),
            toDtos: jest.fn()
          }
        },
        AssetPipe,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();

    controller = moduleRef.get(AssetController);
    service = moduleRef.get(AssetService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(AssetController.prototype.handleGetOne.name, () => {
    it('should return asset DTO for valid contract and tokenId', async () => {
      const asset = buildCollectionAssetEntity({
        contract: '0x0000000000000000000000000000000000000123',
        tokenId: '1',
        collection: buildCollectionEntity({ id: 1, contract: '0x0000000000000000000000000000000000000123' }) as never
      });
      jest.spyOn(service, 'getByKey').mockResolvedValue(asset);
      jest.spyOn(service, 'toDto').mockResolvedValue({
        id: 1,
        contract: '0x0000000000000000000000000000000000000123',
        owners: ['0x0000000000000000000000000000000000000000'],
        tokenId: '1',
        name: 'Test Asset',
        imageMediumUrl: 'https://example.com/image-medium.png',
        imageSmallUrl: 'https://example.com/image-small.png',
        collection: buildCollectionDto({
          id: 1,
          contract: '0x0000000000000000000000000000000000000123',
          imageUrl: 'https://example.com/collection-image.png',
          name: 'Collection Name',
          tokenRange: '1:2',
          tokenSupply: '2',
          tokenStandard: TokenStandard.ERC1155,
          ranking: 1
        })
      });

      const response = await request(app.getHttpServer()).get('/assets/0x0000000000000000000000000000000000000123/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        result: {
          id: 1,
          contract: '0x0000000000000000000000000000000000000123',
          owners: ['0x0000000000000000000000000000000000000000'],
          tokenId: '1',
          collection: {
            id: 1,
            contract: '0x0000000000000000000000000000000000000123',
            imageUrl: 'https://example.com/collection-image.png',
            name: 'Collection Name',
            ranking: 1,
            whitelisted: true,
            tokenRange: '1:2',
            tokenSupply: '2',
            tokenStandard: 'erc1155',
            stats: null,
            floor: null
          },
          name: 'Test Asset',
          imageMediumUrl: 'https://example.com/image-medium.png',
          imageSmallUrl: 'https://example.com/image-small.png'
        }
      });
      expect(service.getByKey).toHaveBeenCalledWith('0x0000000000000000000000000000000000000123', '1');
      expect(service.toDto).toHaveBeenCalledWith(asset);
    });
  });

  describe(AssetController.prototype.handleGetMany.name, () => {
    it('should return assets list', async () => {
      const asset = buildCollectionAssetEntity({
        contract: '0x0000000000000000000000000000000000000123',
        tokenId: '1',
        collection: buildCollectionEntity({
          id: 1,
          contract: '0x0000000000000000000000000000000000000123',
          tokenStandard: TokenStandard.ERC1155
        }) as never
      });
      const dto: AssetDto = {
        id: 1,
        contract: '0x0000000000000000000000000000000000000123',
        owners: ['0x0000000000000000000000000000000000000000'],
        tokenId: '1',
        name: 'Test Asset',
        imageMediumUrl: 'https://example.com/image-medium.png',
        imageSmallUrl: 'https://example.com/image-small.png',
        collection: {
          id: 1,
          contract: '0x0000000000000000000000000000000000000123',
          imageUrl: 'https://example.com/collection-image.png',
          name: 'Collection Name',
          tokenRange: '1:2',
          tokenSupply: '2',
          tokenStandard: TokenStandard.ERC1155,
          ranking: 1,
          whitelisted: true,
          openseaSlug: null,
          stats: null,
          floor: null
        }
      };
      jest.spyOn(service, 'getMany').mockResolvedValue([asset]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const response = await request(app.getHttpServer()).get(
        '/assets?keys=0x9776b2973ae63fa715c52f9e2f9def6b99e99c09-1&projection=collection.stats&page=1&limit=2'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ results: [dto] });
      expect(service.getMany).toHaveBeenCalledWith({
        page: 1,
        limit: 2,
        wallet: undefined,
        keys: [{ contract: '0x9776b2973ae63fa715c52f9e2f9def6b99e99c09', tokenId: '1' }],
        whitelisted: undefined,
        projection: [AssetProjection.CollectionStats]
      });
      expect(service.toDtos).toHaveBeenCalledWith([asset], { projection: [AssetProjection.CollectionStats] });
    });

    it('parses array query params via validation pipe', async () => {
      const asset = buildCollectionAssetEntity({
        contract: '0x0000000000000000000000000000000000000abc',
        tokenId: '2',
        collection: buildCollectionEntity({ id: 2, contract: '0x0000000000000000000000000000000000000abc' }) as never
      });
      jest.spyOn(service, 'getMany').mockResolvedValue([asset]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([
        {
          id: 2,
          contract: '0x0000000000000000000000000000000000000abc',
          owners: [],
          tokenId: '2',
          name: 'Asset Two',
          imageMediumUrl: 'https://example.com/image-medium.png',
          imageSmallUrl: 'https://example.com/image-small.png',
          collection: {
            id: 2,
            contract: '0x0000000000000000000000000000000000000abc',
            imageUrl: 'https://example.com/collection-image.png',
            name: 'Collection Name',
            tokenRange: '1:2',
            tokenSupply: '2',
            tokenStandard: TokenStandard.ERC721,
            ranking: 1,
            whitelisted: true,
            openseaSlug: null,
            stats: null,
            floor: null
          }
        }
      ]);

      const response = await request(app.getHttpServer()).get(
        '/assets?wallet=0X0000000000000000000000000000000000000ABC&keys=0x0000000000000000000000000000000000000abc-2&keys=0x0000000000000000000000000000000000000abc-3&whitelisted=false&projection=collection.floor-price'
      );

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([
        expect.objectContaining({
          contract: '0x0000000000000000000000000000000000000abc',
          tokenId: '2'
        })
      ]);
      expect(service.getMany).toHaveBeenCalledWith({
        wallet: '0x0000000000000000000000000000000000000abc',
        keys: [
          { contract: '0x0000000000000000000000000000000000000abc', tokenId: '2' },
          { contract: '0x0000000000000000000000000000000000000abc', tokenId: '3' }
        ],
        whitelisted: false,
        projection: [AssetProjection.CollectionFloorPrice],
        page: 1,
        limit: 100
      });
      expect(service.toDtos).toHaveBeenCalledWith([asset], { projection: [AssetProjection.CollectionFloorPrice] });
    });

    it('keeps object keys unchanged when already parsed', async () => {
      const asset = buildCollectionAssetEntity({
        contract: '0x0000000000000000000000000000000000000def',
        tokenId: '10',
        collection: buildCollectionEntity({ id: 3, contract: '0x0000000000000000000000000000000000000def' }) as never
      });
      jest.spyOn(service, 'getMany').mockResolvedValue([asset]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([
        {
          id: 3,
          contract: asset.contract,
          owners: [],
          tokenId: '10',
          name: 'Asset Three',
          imageMediumUrl: 'https://example.com/image-medium.png',
          imageSmallUrl: 'https://example.com/image-small.png',
          collection: {
            id: 3,
            contract: asset.contract,
            imageUrl: 'https://example.com/collection-image.png',
            name: 'Collection Name',
            tokenRange: '1:10',
            tokenSupply: '10',
            tokenStandard: TokenStandard.ERC721,
            ranking: 1,
            whitelisted: true,
            openseaSlug: null,
            stats: null,
            floor: null
          }
        }
      ]);

      const response = await request(app.getHttpServer()).get(
        '/assets?keys=0x0000000000000000000000000000000000000def-10&page=2&limit=50'
      );

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([
        expect.objectContaining({
          contract: asset.contract,
          tokenId: '10'
        })
      ]);
      expect(service.getMany).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        wallet: undefined,
        keys: [{ contract: '0x0000000000000000000000000000000000000def', tokenId: '10' }],
        whitelisted: undefined,
        projection: undefined
      });
      expect(service.toDtos).toHaveBeenCalledWith([asset], { projection: [] });
    });

    it('skips key parsing when no keys are provided', async () => {
      const asset = buildCollectionAssetEntity({
        contract: '0x0000000000000000000000000000000000000aaa',
        tokenId: '5',
        collection: buildCollectionEntity({ id: 4, contract: '0x0000000000000000000000000000000000000aaa' }) as never
      });
      jest.spyOn(service, 'getMany').mockResolvedValue([asset]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([
        {
          id: 4,
          contract: asset.contract,
          owners: [],
          tokenId: '5',
          name: 'Asset Four',
          imageMediumUrl: 'https://example.com/image-medium.png',
          imageSmallUrl: 'https://example.com/image-small.png',
          collection: {
            id: 4,
            contract: asset.contract,
            imageUrl: 'https://example.com/collection-image.png',
            name: 'Collection Name',
            tokenRange: '1:5',
            tokenSupply: '5',
            tokenStandard: TokenStandard.ERC721,
            ranking: 1,
            whitelisted: true,
            openseaSlug: null,
            stats: null,
            floor: null
          }
        }
      ]);

      const response = await request(app.getHttpServer()).get('/assets?whitelisted=true&page=3&limit=25');
      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([
        expect.objectContaining({
          contract: asset.contract,
          tokenId: '5'
        })
      ]);
      expect(service.getMany).toHaveBeenCalledWith({
        page: 3,
        limit: 25,
        wallet: undefined,
        keys: undefined,
        whitelisted: true,
        projection: undefined
      });
      expect(service.toDtos).toHaveBeenCalledWith([asset], { projection: [] });
    });
  });

  describe(AssetController.prototype.handleGetManyMessage.name, () => {
    it('returns DTOs for provided keys', async () => {
      const payload = {
        keys: [
          { contract: '0xabc', tokenId: '1' },
          { contract: '0xdef', tokenId: '2' }
        ]
      };
      const assets = [
        buildCollectionAssetEntity({ contract: '0xabc', tokenId: '1' }),
        buildCollectionAssetEntity({ contract: '0xdef', tokenId: '2' })
      ];
      jest.spyOn(service, 'getByKeys').mockResolvedValue(assets);
      jest.spyOn(service, 'toDtos').mockResolvedValue([
        {
          id: 1,
          contract: '0xabc',
          tokenId: '1',
          owners: [],
          name: 'Asset One',
          imageMediumUrl: 'https://example.com/medium-1.png',
          imageSmallUrl: 'https://example.com/small-1.png',
          collection: buildCollectionDto({ id: 1, contract: '0xabc' })
        },
        {
          id: 2,
          contract: '0xdef',
          tokenId: '2',
          owners: [],
          name: 'Asset Two',
          imageMediumUrl: 'https://example.com/medium-2.png',
          imageSmallUrl: 'https://example.com/small-2.png',
          collection: buildCollectionDto({ id: 2, contract: '0xdef' })
        }
      ]);

      const result = await controller.handleGetManyMessage({
        keys: [
          { contract: '0xabc', tokenId: '1' },
          { contract: '0xdef', tokenId: '2' }
        ]
      });

      expect(service.getByKeys).toHaveBeenCalledWith(payload.keys, { skip: 0, limit: payload.keys.length });
      expect(service.toDtos).toHaveBeenCalledWith(assets, { projection: [] });
      expect(result).toEqual({
        data: [
          expect.objectContaining({ contract: '0xabc', tokenId: '1' }),
          expect.objectContaining({ contract: '0xdef', tokenId: '2' })
        ]
      });
    });
  });

  describe(AssetController.prototype.handleGetMessage.name, () => {
    it('should call corresponding method with correct parameters', async () => {
      const asset = buildCollectionAssetEntity({ contract: '0x123', tokenId: '1' });
      jest.spyOn(service, 'toDto').mockResolvedValue({
        id: 1,
        contract: '0x123',
        tokenId: '1',
        collection: buildCollectionDto({ id: 1 }),
        name: 'Test Asset',
        imageMediumUrl: 'https://example.com/image-medium.png',
        imageSmallUrl: 'https://example.com/image-small.png',
        owners: []
      });

      const result = await controller.handleGetMessage(asset);

      expect(result).toEqual({
        data: {
          id: 1,
          owners: [],
          contract: '0x123',
          tokenId: '1',
          name: 'Test Asset',
          imageMediumUrl: 'https://example.com/image-medium.png',
          imageSmallUrl: 'https://example.com/image-small.png',
          collection: {
            contract: '0x1234567890abcdef1234567890abcdef12345678',
            floor: null,
            id: 1,
            imageUrl: 'https://example.com/image.png',
            name: 'Test Collection',
            ranking: 1,
            stats: null,
            tokenRange: '1000:1999',
            tokenStandard: 'erc721',
            tokenSupply: '1000',
            whitelisted: true
          }
        }
      });
    });
  });

  describe(AssetController.prototype.handleCreateMessage.name, () => {
    it('should handle create message without errors', async () => {
      const asset = buildCollectionAssetEntity({ contract: '0x123', tokenId: '1' });

      await expect(controller.handleCreateMessage(asset)).resolves.not.toThrow();
    });
  });
});
