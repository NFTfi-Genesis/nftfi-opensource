import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { AssetProjection } from '@nftfi.api/facades/assets';
import { HttpResponseHeader } from '@nftfi.api/core/dtos';
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';
import { AssetV1Controller } from '../src/asset/asset-v1.controller';
import { AssetService } from '../src/asset/asset.service';
import { buildAssetDto } from './factories';
import type { Response } from 'express';

describe(AssetV1Controller.name, () => {
  let controller: AssetV1Controller;
  let service: AssetService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AssetV1Controller],
      providers: [
        {
          provide: AssetService,
          useValue: {
            getMany: jest.fn(),
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

    controller = moduleRef.get(AssetV1Controller);
    service = moduleRef.get(AssetService);
  });

  describe(AssetV1Controller.prototype.handleGetOne.name, () => {
    it('returns dto from service', async () => {
      const asset = { contract: '0xabc', tokenId: '1' } as CollectionAsset;
      const dto = buildAssetDto({ contract: '0xabc', tokenId: '1' });
      const fnToDto = jest.spyOn(service, 'toDto').mockResolvedValue(dto);

      const result = await controller.handleGetOne(asset);

      expect(fnToDto).toHaveBeenCalledWith(asset);
      expect(result).toEqual(dto);
    });
  });

  describe(AssetV1Controller.prototype.handleGetMany.name, () => {
    it('returns asset dtos with requested projection and sets pagination headers', async () => {
      const query = { projection: [AssetProjection.CollectionStats], page: 1, limit: 2 } as never;
      const assets = [{ id: 1 }] as CollectionAsset[];
      const dtos = [buildAssetDto({ id: 1 })];
      const fnGetMany = jest.spyOn(service, 'getMany').mockResolvedValue(assets);
      const fnToDtos = jest.spyOn(service, 'toDtos').mockResolvedValue(dtos);
      const fnSetHeader = jest.fn();
      const res = { setHeader: fnSetHeader } as unknown as Response;

      const result = await controller.handleGetMany(query, res);

      expect(fnGetMany).toHaveBeenCalledWith(query);
      expect(fnToDtos).toHaveBeenCalledWith(assets, { projection: [AssetProjection.CollectionStats] });
      expect(fnSetHeader).toHaveBeenCalledWith(HttpResponseHeader.PaginationPage, '1');
      expect(fnSetHeader).toHaveBeenCalledWith(HttpResponseHeader.PaginationLimit, '2');
      expect(result).toEqual(dtos);
    });

    it('uses empty projection when query projection is missing', async () => {
      const query = { page: 1, limit: 10 } as never;
      const assets = [{ id: 2 }] as CollectionAsset[];
      jest.spyOn(service, 'getMany').mockResolvedValue(assets);
      const fnToDtos = jest.spyOn(service, 'toDtos').mockResolvedValue([buildAssetDto({ id: 2 })]);
      const fnSetHeader = jest.fn();
      const res = { setHeader: fnSetHeader } as unknown as Response;

      await controller.handleGetMany(query, res);

      expect(fnToDtos).toHaveBeenCalledWith(assets, { projection: [] });
      expect(fnSetHeader).toHaveBeenCalledWith(HttpResponseHeader.PaginationPage, '1');
      expect(fnSetHeader).toHaveBeenCalledWith(HttpResponseHeader.PaginationLimit, '10');
    });
  });
});
