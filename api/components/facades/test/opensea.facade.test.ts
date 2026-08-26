import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { Observable, of } from 'rxjs';
import { Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OpenSeaNotFoundError, OpenSeaUnknownError } from '@nftfi.api/facades/opensea/opensea.errors';
import { OpenSeaFacade, OpenseaNft } from '../src/opensea';

describe(OpenSeaFacade.name, () => {
  let facade: OpenSeaFacade;
  let httpService: HttpService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        OpenSeaFacade,
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

    facade = moduleRef.get(OpenSeaFacade);
    httpService = moduleRef.get(HttpService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  describe(OpenSeaFacade.prototype.getNft.name, () => {
    it('makes paginated calls', async () => {
      const fnPost = jest
        .spyOn(httpService, 'get')
        .mockImplementationOnce(() => of({ data: { nft: { meta: 'data' } } } as unknown as AxiosResponse))
        .mockImplementation(() => of({ data: { projects: [] } } as unknown as AxiosResponse));

      const result = await facade.getNft('0x123', '1');

      expect(result).toEqual({ meta: 'data' });
      expect(fnPost).toHaveBeenCalledWith('/api/v2/chain/ethereum/contract/0x123/nfts/1');
    });
  });

  describe(OpenSeaFacade.prototype.getContract.name, () => {
    it('returns contract metadata', async () => {
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: { name: 'Test Contract', symbol: 'TEST' } } as AxiosResponse));

      const result = await facade.getContract('0x123');

      expect(result).toEqual({ name: 'Test Contract', symbol: 'TEST' });
      expect(fnGet).toHaveBeenCalledWith('/api/v2/chain/ethereum/contract/0x123');
    });
  });

  describe(OpenSeaFacade.prototype.getCollectionBySlug.name, () => {
    it('returns collection metadata by slug', async () => {
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: { name: 'Test Collection', slug: 'test-collection' } } as AxiosResponse));

      const result = await facade.getCollectionBySlug('test-collection');

      expect(result).toEqual({ name: 'Test Collection', slug: 'test-collection' });
      expect(fnGet).toHaveBeenCalledWith('/api/v2/collections/test-collection');
    });
  });

  describe(OpenSeaFacade.prototype.getNftsByContract.name, () => {
    it('returns paginated NFTs by contract', async () => {
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: { nfts: [{ tokenId: '1' }], next: 'nextPage' } } as AxiosResponse));

      const result = await facade.getNftsByContract('0x123', { limit: 10, next: '' });

      expect(result).toEqual([[{ tokenId: '1' }], 'nextPage']);
      expect(fnGet).toHaveBeenCalledWith('/api/v2/chain/ethereum/contract/0x123/nfts', {
        params: { limit: 10 }
      });
    });
  });

  describe(OpenSeaFacade.prototype.getNftsByAccount.name, () => {
    it('returns paginated NFTs by account', async () => {
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: { nfts: [{ tokenId: '1' }], next: 'cursor' } } as AxiosResponse));

      const result = await facade.getNftsByAccount('0xabc', { limit: 5, next: 'cursor0' });

      expect(result).toEqual([[{ tokenId: '1' }], 'cursor']);
      expect(fnGet).toHaveBeenCalledWith('/api/v2/chain/ethereum/account/0xabc/nfts', {
        params: { limit: 5, next: 'cursor0' }
      });
    });
  });

  describe(OpenSeaFacade.prototype.iterateOverNftsByContract.name, () => {
    it('iterates over NFTs by contract', async () => {
      const fnGet = jest
        .spyOn(facade, 'getNftsByContract')
        .mockResolvedValueOnce([[{ identifier: '1' } as OpenseaNft], 'nextPage'])
        .mockResolvedValueOnce([[{ identifier: '2' } as OpenseaNft], '']);

      const iterator = facade.iterateOverNftsByContract('0x123', { limit: 10 });

      const firstPage = await iterator.next();
      expect(firstPage.value).toEqual([{ identifier: '1' }]);
      expect(fnGet).toHaveBeenCalledWith('0x123', { limit: 10, next: '' });

      const secondPage = await iterator.next();
      expect(secondPage.value).toEqual([{ identifier: '2' }]);
      expect(fnGet).toHaveBeenCalledWith('0x123', { limit: 10, next: 'nextPage' });

      const finalPage = await iterator.next();
      expect(finalPage.done).toBe(true);
    });
  });

  describe(OpenSeaFacade.prototype.iterateOverNftsByAccount.name, () => {
    it('iterates over NFTs by account', async () => {
      const fnGet = jest
        .spyOn(facade, 'getNftsByAccount')
        .mockResolvedValueOnce([[{ identifier: 'a' } as OpenseaNft], 'cursor1'])
        .mockResolvedValueOnce([[{ identifier: 'b' } as OpenseaNft], '']);

      const iterator = facade.iterateOverNftsByAccount('0xabc', { limit: 2, next: 'start-cursor' });

      const firstPage = await iterator.next();
      expect(firstPage.value).toEqual([{ identifier: 'a' }]);
      expect(fnGet).toHaveBeenCalledWith('0xabc', { limit: 2, next: 'start-cursor' });

      const secondPage = await iterator.next();
      expect(secondPage.value).toEqual([{ identifier: 'b' }]);
      expect(fnGet).toHaveBeenCalledWith('0xabc', { limit: 2, next: 'cursor1' });

      const finalPage = await iterator.next();
      expect(finalPage.done).toBe(true);
    });

    it('starts with empty cursor when next is not provided', async () => {
      const fnGet = jest
        .spyOn(facade, 'getNftsByAccount')
        .mockResolvedValueOnce([[{ identifier: 'x' } as OpenseaNft], '']);

      const iterator = facade.iterateOverNftsByAccount('0xabc', { limit: 2 });
      const firstPage = await iterator.next();

      expect(firstPage.value).toEqual([{ identifier: 'x' }]);
      expect(fnGet).toHaveBeenCalledWith('0xabc', { limit: 2, next: '' });
    });
  });

  describe(OpenSeaFacade.prototype['handleUnknownError'].name, () => {
    it('throws AlchemyUnknownError for unknown errors', () => {
      const error = new Error('Unknown error');
      const result = facade['handleUnknownError'](error);
      expect(result).toBeInstanceOf(Observable);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(OpenSeaUnknownError);
        }
      });
    });

    it('throws OpenSeaNotFoundError for 404 errors', () => {
      const error = {
        response: { status: 404, data: 'Not Found' },
        message: 'Not Found',
        isAxiosError: true
      } as AxiosError;
      const result = facade['handleUnknownError'](error);
      expect(result).toBeInstanceOf(Observable);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(OpenSeaNotFoundError);
        }
      });
    });

    it('throws OpenSeaUnknownError for other errors', () => {
      const error = {
        code: 'EUNKNOWN',
        message: 'Internal Server Error',
        isAxiosError: true
      } as AxiosError;
      const result = facade['handleUnknownError'](error);
      expect(result).toBeInstanceOf(Observable);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(OpenSeaUnknownError);
        }
      });
    });
  });
});
