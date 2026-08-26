import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { Logger } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { GnosisFacade } from '../src/gnosis';

describe(GnosisFacade.name, () => {
  let facade: GnosisFacade;
  let httpService: HttpService;
  let cacheManager: Cache;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        GnosisFacade,
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

    facade = moduleRef.get(GnosisFacade);
    httpService = moduleRef.get(HttpService);
    cacheManager = moduleRef.get(CACHE_MANAGER);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
  });

  describe(GnosisFacade.prototype.getSafes.name, () => {
    it('returns lowercased safe addresses for the owner', async () => {
      const fnGet = jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: { safes: ['0xAAA0000000000000000000000000000000000001', '0xBBB0000000000000000000000000000000000002'] }
        } as AxiosResponse)
      );
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);

      const result = await facade.getSafes('0xOwner0000000000000000000000000000000Cafe');

      expect(result).toEqual([
        '0xaaa0000000000000000000000000000000000001',
        '0xbbb0000000000000000000000000000000000002'
      ]);
      expect(fnGet).toHaveBeenCalledWith('/owners/0xOwner0000000000000000000000000000000Cafe/safes/');
    });

    it('returns an empty array when the owner has no safes', async () => {
      const fnGet = jest.spyOn(httpService, 'get').mockReturnValue(of({ data: { safes: [] } } as AxiosResponse));
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);

      const result = await facade.getSafes('0xowner');

      expect(result).toEqual([]);
      expect(fnGet).toHaveBeenCalledWith('/owners/0xowner/safes/');
    });

    it('caches the result with a 12-hour TTL keyed by owner', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: { safes: ['0xAbC0000000000000000000000000000000000003'] } } as AxiosResponse));
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnCacheSet = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);

      await facade.getSafes('0xowner');

      expect(fnCacheSet).toHaveBeenCalledWith(
        'gnosis:safes:0xowner',
        ['0xabc0000000000000000000000000000000000003'],
        43200000
      );
    });

    it('returns the cached value without calling the HTTP service when present', async () => {
      const cached = ['0xcached0000000000000000000000000000000004'];
      const fnGet = jest.spyOn(httpService, 'get');
      const fnCacheGet = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(cached);
      const fnCacheSet = jest.spyOn(cacheManager.store, 'set');

      const result = await facade.getSafes('0xowner');

      expect(result).toEqual(['0xcached0000000000000000000000000000000004']);
      expect(fnCacheGet).toHaveBeenCalledWith('gnosis:safes:0xowner');
      expect(fnGet).not.toHaveBeenCalled();
      expect(fnCacheSet).not.toHaveBeenCalled();
    });
  });
});
