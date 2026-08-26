import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { Logger } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { NftPriceFloorFacade, NftPriceFloorNotFoundError, NftPriceFloorUnknownError } from '../src/nft-price-floor';
import { buildProject } from './factories/nft-price-floor.factory';

describe(NftPriceFloorFacade.name, () => {
  let facade: NftPriceFloorFacade;
  let httpService: HttpService;
  let cacheManager: Cache;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        NftPriceFloorFacade,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn()
          }
        },
        { provide: CACHE_MANAGER, useValue: { store: { get: jest.fn(), set: jest.fn() } } }
      ]
    }).compile();

    facade = moduleRef.get(NftPriceFloorFacade);
    httpService = moduleRef.get(HttpService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  describe(NftPriceFloorFacade.prototype.iterateProjects, () => {
    it('makes paginated calls', async () => {
      const fnPost = jest
        .spyOn(httpService, 'get')
        .mockImplementationOnce(() => of({ data: { projects: [buildProject()] } } as unknown as AxiosResponse))
        .mockImplementation(() => of({ data: { projects: [] } } as unknown as AxiosResponse));
      for await (const projects of facade.iterateProjects()) {
        expect(projects).toHaveLength(1);
      }

      expect(fnPost).toHaveBeenCalledWith('/projects-v2', {
        params: { blockchains: 'ethereum', limit: 100, page: 1 }
      });
    });
  });

  describe(NftPriceFloorFacade.prototype.getProjects.name, () => {
    it('returns projects', async () => {
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of({ data: { projects: [buildProject()] } } as unknown as AxiosResponse));
      const fnCacheSet = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);

      const projects = await facade.getProjects({ page: 1, limit: 10, blockchains: ['ethereum'] });
      expect(projects).toHaveLength(1);
      expect(fnGet).toHaveBeenCalledWith('/projects-v2', {
        params: { blockchains: 'ethereum', limit: 10, page: 1 }
      });
      expect(fnCacheSet).toHaveBeenCalledWith('nft-price-floor-projects-1-10-ethereum', expect.any(Array), 43200000);
    });
  });

  describe(NftPriceFloorFacade.prototype.getDetails.name, () => {
    it('returns project details', async () => {
      const project = buildProject();
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of({ data: { details: project } } as unknown as AxiosResponse));
      jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);

      const result = await facade.getDetails(project.slug);
      expect(result.details).toEqual(project);
      expect(fnGet).toHaveBeenCalledWith('/projects/default-project');
    });
  });

  describe(NftPriceFloorFacade.prototype.getHistoricalPrices.name, () => {
    it('returns project prices', async () => {
      const project = buildProject();
      const prices = [{ price: 100, timestamp: new Date() }];
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of({ data: prices } as unknown as AxiosResponse));

      const result = await facade.getHistoricalPrices(project.slug, {
        start: new Date(),
        end: new Date()
      });

      expect(result).toEqual(prices);
      expect(fnGet).toHaveBeenCalledWith(`/projects/${project.slug}/history/pricefloor/1d`, {
        params: { start: expect.any(Number), end: expect.any(Number) }
      });
    });
  });

  describe(NftPriceFloorFacade.parseMask.name, () => {
    it('parses contract and range from mask', () => {
      const result = NftPriceFloorFacade.parseMask('0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97:100:200');
      expect(result).toEqual({ contract: '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97', range: ['100', '200'] });
    });

    it('returns * range if no range specified', () => {
      const result = NftPriceFloorFacade.parseMask('0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97');
      expect(result).toEqual({ contract: '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97' });
    });

    it('throws error for invalid format', () => {
      expect(() => NftPriceFloorFacade.parseMask(undefined)).toThrow(
        'invalid address (argument="address", value="", code=INVALID_ARGUMENT, version=address/5.7.0)'
      );
    });

    it('throws error for invalid format', () => {
      expect(() => NftPriceFloorFacade.parseMask('0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97:aaa:bbb')).toThrow(
        '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97:aaa:bbb'
      );
    });

    it('throws error for invalid format', () => {
      expect(() => NftPriceFloorFacade.parseMask('invalid')).toThrow(
        'invalid address (argument="address", value="invalid", code=INVALID_ARGUMENT, version=address/5.7.0)'
      );
    });
  });

  describe(NftPriceFloorFacade.prototype['handleUnknownError'].name, () => {
    it('returns NftPriceFloorUnknownError for unknown errors', () => {
      const result = facade['handleUnknownError'](new Error('Test Error'));
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(NftPriceFloorUnknownError);
        }
      });
    });

    it('returns NftPriceFloorNotFoundError for 404', () => {
      const error = {
        response: { status: 404 },
        message: 'Not Found',
        isAxiosError: true
      } as AxiosError;

      const result = facade['handleUnknownError'](error);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(NftPriceFloorNotFoundError);
        }
      });
    });

    it('returns NftPriceFloorUnknownError for other errors', () => {
      const error = {
        code: 'EUNKNOWN',
        message: 'Internal Server Error',
        isAxiosError: true
      } as AxiosError;

      const result = facade['handleUnknownError'](error);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(NftPriceFloorUnknownError);
        }
      });
    });
  });
});
