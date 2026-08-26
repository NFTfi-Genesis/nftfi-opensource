import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { httpValidationPipe } from '@nftfi.api/validation';
import { buildCollectionEntity as buildCollection } from '@nftfi.api/repositories/postgres/factories/collection';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { CollectionProjection } from '@nftfi.api/facades/assets';
import { CollectionController } from '../src/collection/collection.controller';
import { CollectionService } from '../src/collection/collection.service';
import { buildCollectionDto, buildCollectionFloorPriceDto } from './factories';

describe(CollectionController.name, () => {
  let controller: CollectionController;
  let service: CollectionService;
  let app: INestApplication;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        {
          provide: CollectionService,
          useValue: {
            getByKey: jest.fn(),
            getMany: jest.fn(),
            getByContract: jest.fn(),
            getByKeys: jest.fn(),
            count: jest.fn(),
            toDto: jest.fn(),
            toDtos: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            store: {
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn()
            }
          }
        }
      ]
    }).compile();

    controller = moduleRef.get(CollectionController);
    service = moduleRef.get(CollectionService);

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(httpValidationPipe);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(CollectionController.prototype.handleGetMany.name, () => {
    it('returns collections list', async () => {
      const dto = buildCollectionDto({
        floor: buildCollectionFloorPriceDto({ priceEth: 1.2, priceUsd: 4000 })
      });
      const collection = buildCollection({ id: 1 });
      jest.spyOn(service, 'getMany').mockResolvedValue([collection]);
      jest.spyOn(service, 'count').mockResolvedValue(1);
      jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const response = await request(app.getHttpServer()).get(
        '/collections?contracts=0x1234567890abcdef1234567890abcdef12345678&whitelisted=true&page=1&limit=2&projection=floor-price'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ results: [dto], pagination: { total: 1 } });
      expect(service.getMany).toHaveBeenCalledWith({
        contracts: ['0x1234567890abcdef1234567890abcdef12345678'],
        whitelisted: true,
        loanTotalUsdMin: undefined,
        loanTotalUsdMax: undefined,
        loanAvgUsdMin: undefined,
        loanAvgUsdMax: undefined,
        projection: [CollectionProjection.FloorPrice],
        page: 1,
        limit: 2
      });
      expect(service.toDtos).toHaveBeenCalledWith([collection], {
        projection: [CollectionProjection.FloorPrice]
      });
    });

    it('uses empty projection when projection query param is not provided', async () => {
      const collection = buildCollection({ id: 6 });
      const dto = buildCollectionDto({ id: 6 });
      jest.spyOn(service, 'getMany').mockResolvedValue([collection]);
      jest.spyOn(service, 'count').mockResolvedValue(1);
      const fnToDtos = jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const result = await controller.handleGetMany({ page: 1, limit: 10 } as never);

      expect(fnToDtos).toHaveBeenCalledWith([collection], { projection: [] });
      expect(result).toEqual({ results: [dto], pagination: { total: 1 } });
    });
  });

  describe(CollectionController.prototype.handleGet.name, () => {
    it('returns collections by contract', async () => {
      const dto = buildCollectionDto({
        contract: '0xabc',
        tokenRange: '1:2',
        floor: buildCollectionFloorPriceDto()
      });
      const collection = buildCollection({ id: 2 });
      jest.spyOn(service, 'getByContract').mockResolvedValue([collection]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const response = await request(app.getHttpServer()).get('/collections/0xabc');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ results: [dto] });
      expect(service.getByContract).toHaveBeenCalledWith('0xabc');
      expect(service.toDtos).toHaveBeenCalledWith([collection], {
        projection: [CollectionProjection.FloorPrice]
      });
    });
  });

  describe(CollectionController.prototype.handleGetByKeyMessage.name, () => {
    it('should return collection DTO for valid contract and tokenId from message pattern', async () => {
      jest.spyOn(service, 'getByKey').mockResolvedValue(buildCollection({ id: 3 }));
      jest.spyOn(service, 'toDto').mockResolvedValue(
        buildCollectionDto({
          id: 3,
          contract: '0x123',
          imageUrl: 'https://example.com/collection-image.png',
          name: 'Collection Name',
          tokenRange: '1:2',
          tokenStandard: TokenStandard.ERC721,
          tokenSupply: '2',
          ranking: 1
        })
      );

      const result = await controller.handleGetByKeyMessage({ contract: '0x123', tokenId: '1' });

      expect(result).toEqual({
        data: {
          id: 3,
          contract: '0x123',
          imageUrl: 'https://example.com/collection-image.png',
          name: 'Collection Name',
          ranking: 1,
          tokenRange: '1:2',
          tokenSupply: '2',
          tokenStandard: TokenStandard.ERC721,
          floor: null,
          stats: null,
          whitelisted: true
        }
      });
    });

    it('should return null if collection not found', async () => {
      jest.spyOn(service, 'getByKey').mockResolvedValue(null);

      const result = await controller.handleGetByKeyMessage({ contract: '0xnonexistent', tokenId: '9999' });

      expect(result).toEqual({
        data: null
      });
    });
  });

  describe(CollectionController.prototype.handleGetMessage.name, () => {
    it('returns collections list for rpc message', async () => {
      const collection = buildCollection({ id: 4 });
      const dto = buildCollectionDto({ id: 4, contract: '0xabc' });
      jest.spyOn(service, 'getByContract').mockResolvedValue([collection]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const result = await controller.handleGetMessage({ contract: '0xabc' });

      expect(result).toEqual({ data: [dto] });
      expect(service.getByContract).toHaveBeenCalledWith('0xabc');
      expect(service.toDtos).toHaveBeenCalledWith([collection], { projection: [CollectionProjection.FloorPrice] });
    });
  });

  describe(CollectionController.prototype.handleGetByKeysMessage.name, () => {
    it('returns collections list for keys rpc message', async () => {
      const collection = buildCollection({ id: 5, contract: '0xdef' });
      const dto = buildCollectionDto({ id: 5, contract: '0xdef' });
      jest.spyOn(service, 'getByKeys').mockResolvedValue([collection]);
      jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const params = {
        keys: [{ contract: '0xdef', tokenId: '1' }],
        projection: [CollectionProjection.FloorPrice]
      };
      const result = await controller.handleGetByKeysMessage(params);

      expect(result).toEqual({ data: [dto] });
      expect(service.getByKeys).toHaveBeenCalledWith(params.keys);
      expect(service.toDtos).toHaveBeenCalledWith([collection], { projection: params.projection });
    });
  });
});
