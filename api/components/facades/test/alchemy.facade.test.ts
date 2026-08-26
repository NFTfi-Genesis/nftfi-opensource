import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable, of } from 'rxjs';
import { Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AlchemyNotFoundError, AlchemyUnknownError } from '@nftfi.api/facades/alchemy/alchemy.errors';
import { AlchemyFacade } from '../src/alchemy';
import { buildAlchemyNftMetadata } from './factories/alchemy.factory';

describe(AlchemyFacade.name, () => {
  let facade: AlchemyFacade;
  let httpService: HttpService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        AlchemyFacade,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            axiosRef: {
              defaults: {
                headers: {
                  'x-api-key': 'test-api-key'
                }
              }
            }
          }
        },
        { provide: CACHE_MANAGER, useValue: { store: { get: jest.fn(), set: jest.fn() } } }
      ]
    }).compile();

    facade = moduleRef.get(AlchemyFacade);
    httpService = moduleRef.get(HttpService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  describe(AlchemyFacade.prototype.getNftMetadata.name, () => {
    it('returns project details', async () => {
      const metadata = buildAlchemyNftMetadata();
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of({ data: metadata } as unknown as AxiosResponse));

      const result = await facade.getNftMetadata('0x123', '1');
      expect(result.contract.address).toEqual('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnGet).toHaveBeenCalledWith('/nft/v3/test-api-key/getNFTMetadata', {
        params: { contractAddress: '0x123', tokenId: '1' }
      });
    });
  });

  describe(AlchemyFacade.prototype.getContractMetadata.name, () => {
    it('returns contract metadata', async () => {
      const metadata = {
        contract: {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'Test Contract',
          symbol: 'TEST',
          totalSupply: '1000'
        },
        openSeaMetadata: {
          imageUrl: 'https://example.com/image.png',
          description: 'Test description'
        }
      };
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of({ data: metadata } as unknown as AxiosResponse));

      const result = await facade.getContractMetadata('0x123');
      expect(result).toEqual({
        contract: {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'Test Contract',
          symbol: 'TEST',
          totalSupply: '1000'
        },
        openSeaMetadata: {
          imageUrl: 'https://example.com/image.png',
          description: 'Test description'
        }
      });
      expect(fnGet).toHaveBeenCalledWith('/nft/v3/test-api-key/getContractMetadata', {
        params: { contractAddress: '0x123' }
      });
    });
  });

  describe(AlchemyFacade.prototype.getNftOwners.name, () => {
    it('returns NFT owners', async () => {
      const owners = {
        owners: ['0x1234567890abcdef1234567890ABCDEF12345678'],
        totalCount: 1
      };
      const fnGet = jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of({ data: owners } as unknown as AxiosResponse));

      const result = await facade.getNftOwners('0x123', '1');
      expect(result).toEqual(['0x1234567890abcdef1234567890ABCDEF12345678']);
      expect(fnGet).toHaveBeenCalledWith('/nft/v3/test-api-key/getOwnersForNFT', {
        params: { contractAddress: '0x123', tokenId: '1' }
      });
    });
  });

  describe(AlchemyFacade.prototype.getNftsByAccount.name, () => {
    it('returns NFTs by account with pagination', async () => {
      const ownedNfts = [
        { contractAddress: '0xabc', tokenId: '1', balance: '1', isSpam: false, spamClassifications: [] }
      ];
      const fnGet = jest.spyOn(httpService, 'get').mockImplementation(() =>
        of({
          data: {
            ownedNfts,
            pageKey: 'next-cursor'
          }
        } as unknown as AxiosResponse)
      );

      const result = await facade.getNftsByAccount('0xowner', { limit: 25, next: 'cursor' });

      expect(result).toEqual([ownedNfts, 'next-cursor']);
      expect(fnGet).toHaveBeenCalledWith('/nft/v3/test-api-key/getNFTsForOwner', {
        params: { owner: '0xowner', pageSize: 25, pageKey: 'cursor', withMetadata: false }
      });
    });
  });

  describe(AlchemyFacade.prototype.iterateOverNftsByAccount.name, () => {
    it('iterates through paginated results until next is empty', async () => {
      const firstPage = [
        { contractAddress: '0xabc', tokenId: '1', balance: '1', isSpam: false, spamClassifications: [] }
      ];
      const secondPage = [
        { contractAddress: '0xabc', tokenId: '2', balance: '1', isSpam: false, spamClassifications: [] }
      ];
      const fnGet = jest
        .spyOn(facade, 'getNftsByAccount')
        .mockResolvedValueOnce([firstPage, 'next-cursor'])
        .mockResolvedValueOnce([secondPage, null]);

      const pages: (typeof firstPage)[] = [];
      for await (const page of facade.iterateOverNftsByAccount('0xowner', { limit: 2 })) {
        pages.push(page);
      }

      expect(pages).toEqual([firstPage, secondPage]);
      expect(fnGet).toHaveBeenNthCalledWith(1, '0xowner', { limit: 2, next: '' });
      expect(fnGet).toHaveBeenNthCalledWith(2, '0xowner', { limit: 2, next: 'next-cursor' });
    });
  });

  describe(AlchemyFacade.prototype['handleUnknownError'].name, () => {
    it('throws AlchemyUnknownError for unknown errors', () => {
      const error = new Error('Unknown error');
      const result = facade['handleUnknownError'](error);
      expect(result).toBeInstanceOf(Observable);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(AlchemyUnknownError);
        }
      });
    });

    it('throws AlchemyNotFoundError for 404 errors', () => {
      const error = {
        response: {
          status: 404,
          data: 'Not Found'
        },
        isAxiosError: true
      } as unknown as Error;
      const result = facade['handleUnknownError'](error);
      expect(result).toBeInstanceOf(Observable);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(AlchemyNotFoundError);
        }
      });
    });

    it('throws AlchemyUnknownError for other Axios errors', () => {
      const error = {
        code: 'ECONNABORTED',
        isAxiosError: true
      } as unknown as Error;
      const result = facade['handleUnknownError'](error);
      expect(result).toBeInstanceOf(Observable);
      result.subscribe({
        error: err => {
          expect(err).toBeInstanceOf(AlchemyUnknownError);
        }
      });
    });
  });
});
