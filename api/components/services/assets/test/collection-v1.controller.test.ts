import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpResponseHeader } from '@nftfi.api/core/dtos';
import { CollectionProjection } from '@nftfi.api/facades/assets';
import { CollectionV1Controller } from '../src/collection/collection-v1.controller';
import { CollectionService } from '../src/collection/collection.service';
import { buildCollectionDto } from './factories';

describe(CollectionV1Controller.name, () => {
  let controller: CollectionV1Controller;
  let service: CollectionService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [CollectionV1Controller],
      providers: [
        {
          provide: CollectionService,
          useValue: {
            getMany: jest.fn(),
            count: jest.fn(),
            toDtos: jest.fn(),
            getByContract: jest.fn(),
            getByBorrower: jest.fn(),
            countByBorrower: jest.fn()
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

    controller = moduleRef.get(CollectionV1Controller);
    service = moduleRef.get(CollectionService);
  });

  describe(CollectionV1Controller.prototype.handleGetMany.name, () => {
    it('sets pagination headers and returns json payload', async () => {
      const query = {
        contracts: ['0x1234567890abcdef1234567890abcdef12345678'],
        page: 2,
        limit: 5,
        projection: [CollectionProjection.FloorPrice]
      } as never;
      const collections = [{}] as never;
      const dtos = [buildCollectionDto()];
      jest.spyOn(service, 'getMany').mockResolvedValue(collections);
      jest.spyOn(service, 'count').mockResolvedValue(11);
      jest.spyOn(service, 'toDtos').mockResolvedValue(dtos);
      const setHeader = jest.fn();
      const json = jest.fn().mockReturnValue({ ok: true });
      const res = {
        setHeader,
        json
      } as unknown as Parameters<CollectionV1Controller['handleGetMany']>[1];

      const result = await controller.handleGetMany(query, res);

      expect(service.getMany).toHaveBeenCalledWith(query);
      expect(service.count).toHaveBeenCalledWith(query);
      expect(service.toDtos).toHaveBeenCalledWith(collections, { projection: [CollectionProjection.FloorPrice] });
      expect(setHeader).toHaveBeenNthCalledWith(1, HttpResponseHeader.PaginationPage, '2');
      expect(setHeader).toHaveBeenNthCalledWith(2, HttpResponseHeader.PaginationLimit, '5');
      expect(setHeader).toHaveBeenNthCalledWith(3, HttpResponseHeader.PaginationTotal, '11');
      expect(result).toEqual(dtos);
    });

    it('uses empty projection when query projection is missing', async () => {
      const query = { page: 1, limit: 10 } as never;
      jest.spyOn(service, 'getMany').mockResolvedValue([]);
      jest.spyOn(service, 'count').mockResolvedValue(0);
      const fnToDtos = jest.spyOn(service, 'toDtos').mockResolvedValue([]);
      const setHeader = jest.fn();
      const res = {
        setHeader
      } as unknown as Parameters<CollectionV1Controller['handleGetMany']>[1];

      await controller.handleGetMany(query, res);

      expect(fnToDtos).toHaveBeenCalledWith([], { projection: [] });
    });
  });

  describe(CollectionV1Controller.prototype.handleGet.name, () => {
    it('returns collection dtos with floor-price projection', async () => {
      const collections = [{}] as never;
      const dtos = [buildCollectionDto({ contract: '0xabc' })];
      jest.spyOn(service, 'getByContract').mockResolvedValue(collections);
      jest.spyOn(service, 'toDtos').mockResolvedValue(dtos);

      const result = await controller.handleGet('0xabc');

      expect(service.getByContract).toHaveBeenCalledWith('0xabc');
      expect(service.toDtos).toHaveBeenCalledWith(collections, { projection: [CollectionProjection.FloorPrice] });
      expect(result).toEqual(dtos);
    });
  });

  describe(CollectionV1Controller.prototype.handleGetByBorrower.name, () => {
    it('sets pagination headers and returns borrower collections', async () => {
      const query = { page: 2, limit: 3 } as never;
      const collections = [{}] as never;
      const dtos = [buildCollectionDto({ contract: '0xabc' })];
      const fnGet = jest.spyOn(service, 'getByBorrower').mockResolvedValue(collections);
      const fnCount = jest.spyOn(service, 'countByBorrower').mockResolvedValue(9);
      const fnDtos = jest.spyOn(service, 'toDtos').mockResolvedValue(dtos);
      const setHeader = jest.fn();
      const json = jest.fn().mockReturnValue({ ok: true });
      const res = { setHeader, json } as unknown as Parameters<CollectionV1Controller['handleGetByBorrower']>[2];

      const result = await controller.handleGetByBorrower('0xABCDEF', query, res);

      expect(fnGet).toHaveBeenCalledWith('0xabcdef', query);
      expect(fnCount).toHaveBeenCalledWith('0xabcdef', query);
      expect(fnDtos).toHaveBeenCalledWith(collections, { projection: [] });
      expect(setHeader).toHaveBeenNthCalledWith(1, HttpResponseHeader.PaginationPage, '2');
      expect(setHeader).toHaveBeenNthCalledWith(2, HttpResponseHeader.PaginationLimit, '3');
      expect(setHeader).toHaveBeenNthCalledWith(3, HttpResponseHeader.PaginationTotal, '9');
      expect(result).toEqual(dtos);
    });
  });
});
