import fs from 'fs/promises';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthModule } from '@nftfi.api/modules/health';
import { AlchemyFacade, AlchemyNft } from '@nftfi.api/facades/alchemy';
import { OpenSeaFacade, OpenseaNft } from '@nftfi.api/facades/opensea';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { AssetMetadataService } from '../src/asset/asset-metadata.service';
import { AssetContract } from '../src/asset-contract';
import { MediaProcessorService } from '../src/media-processor.service';
import { MetadataService } from '../src/metadata.service';
import { PodResourceGuardService } from '../src/pod-resource-guard.service';

jest.mock('fs/promises');

describe(AssetMetadataService.name, () => {
  let service: AssetMetadataService;
  let alchemyFacade: AlchemyFacade;
  let openseaFacade: OpenSeaFacade;
  let contractService: AssetContract;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers();

    const moduleRef = await Test.createTestingModule({
      imports: [
        HealthModule,
        ConfigModule.forRoot({
          load: [
            (): object => ({
              baseDir: '/test',
              buckets: { assets: 'gs://test-assets' },
              images: {
                asset: {
                  small: {
                    maxHeight: 320,
                    maxWidth: 320
                  },
                  medium: {
                    maxHeight: 640,
                    maxWidth: 640
                  }
                },
                defaults: {
                  '0xgondi-1': {
                    imageUrl: 'https://app.nftfi.com/ns/assets/gondi-vault.png',
                    name: (tokenId: string) => `Gondi Vault #${tokenId}`
                  },
                  '0xgondi-2': {
                    imageUrl: 'https://app.nftfi.com/ns/assets/gnosis-vault.png',
                    name: 'Gnosis Vault'
                  }
                },
                placeholder: {
                  '0xgondi-1': 'https://app.nftfi.com/ns/assets/gondi-vault.png',
                  '0xunknown': 'https://app.nftfi.com/ns/assets/image-placeholder.png'
                }
              }
            })
          ]
        })
      ],
      providers: [
        AssetMetadataService,
        {
          provide: AlchemyFacade,
          useValue: { getNftMetadata: jest.fn(), getNftOwners: jest.fn() }
        },
        {
          provide: OpenSeaFacade,
          useValue: { getNft: jest.fn() }
        },
        {
          provide: AssetContract,
          useValue: { getContractInstance: jest.fn() }
        },
        {
          provide: MediaProcessorService,
          useValue: {}
        },
        {
          provide: GcpStorageFacade,
          useValue: {}
        },
        {
          provide: PodResourceGuardService,
          useValue: { hasCapacity: jest.fn().mockResolvedValue(true) }
        },
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

    service = moduleRef.get(AssetMetadataService);
    alchemyFacade = moduleRef.get(AlchemyFacade);
    openseaFacade = moduleRef.get(OpenSeaFacade);
    contractService = moduleRef.get(AssetContract);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
  });

  describe(AssetMetadataService.prototype.getOwners.name, () => {
    it('returns owners from Alchemy metadata', async () => {
      const fnGetOwners = jest
        .spyOn(alchemyFacade, 'getNftOwners')
        .mockResolvedValue(['0x1234567890ABCDEF1234567890ABCDEF12345678']);
      const metadata = await service.getOwners('0x123', '1');
      expect(metadata).toEqual(['0x1234567890abcdef1234567890abcdef12345678']);
      expect(fnGetOwners).toHaveBeenCalledWith('0x123', '1');
    });

    it('returns empty array if Alchemy throws an error', async () => {
      const fnGetOwners = jest.spyOn(alchemyFacade, 'getNftOwners').mockRejectedValue(new Error('Network error'));
      const metadata = await service.getOwners('0x123', '1');
      expect(metadata).toEqual([]);
      expect(fnGetOwners).toHaveBeenCalledWith('0x123', '1');
    });
  });

  describe(AssetMetadataService.prototype.getName.name, () => {
    it('returns name from opensea', async () => {
      const fnGetNft = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        name: 'Opensea Test Vault #1'
      } as OpenseaNft);

      const name = await service.getName('0x123', '1');

      expect(name).toEqual('Opensea Test Vault #1');
      expect(fnGetNft).toHaveBeenCalledWith('0x123', '1');
    });

    it('falls back to defaults when opensea name is missing', async () => {
      const fnGetNft = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({ name: '' } as OpenseaNft);

      const name = await service.getName('0x999', '1');

      expect(name).toEqual('#1');
      expect(fnGetNft).toHaveBeenCalledWith('0x999', '1');
    });

    it('returns default name from function if opensea throws an error', async () => {
      jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('Network error'));
      const name = await service.getName('0xgondi-1', '1');

      expect(name).toEqual('Gondi Vault #1');
    });

    it('returns default name from string config if opensea throws an error', async () => {
      jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('Network error'));
      const name = await service.getName('0xgondi-2', '1');
      expect(name).toEqual('Gnosis Vault');
    });

    it('returns default name if contract is not found in defaults', async () => {
      jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('Network error'));

      const name = await service.getName('0x999', '1');

      expect(name).toEqual('#1');
    });
  });

  describe(AssetMetadataService.prototype.getImageUrls.name, () => {
    it('finds metadata on Opensea', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: 'https://example.com/image.png'
      } as OpenseaNft);

      jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue([
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
        ]);

      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});

      const metadata = await service.getImageUrls('0x123', '1');

      expect(metadata).toEqual({
        imageSmallUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
        imageMediumUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
      });
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/image.png', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetMetadata).toHaveBeenCalledTimes(1);
    });

    it('finds metadata on alchemy image url if opensea has no image', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: null
      } as OpenseaNft);
      const fnGetAlchemyMetadata = jest
        .spyOn(alchemyFacade, 'getNftMetadata')
        .mockResolvedValue({ image: { originalUrl: 'https://example.com/alchemy-image.png' } } as AlchemyNft);

      jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue([
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
        ]);

      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});

      const metadata = await service.getImageUrls('0x123', '1');

      expect(metadata).toEqual({
        imageSmallUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
        imageMediumUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
      });
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/alchemy-image.png', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetOpenseaMetadata).toHaveBeenCalledTimes(1);
      expect(fnGetAlchemyMetadata).toHaveBeenCalledTimes(1);
    });

    it('finds metadata on alchemy contract image url if opensea has no image', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: null
      } as OpenseaNft);
      const fnGetAlchemyMetadata = jest.spyOn(alchemyFacade, 'getNftMetadata').mockResolvedValue({
        image: { originalUrl: null },
        contract: { openSeaMetadata: { imageUrl: 'https://example.com/alchemy-contract-image.png' } }
      } as AlchemyNft);

      jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue([
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
        ]);

      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});

      const metadata = await service.getImageUrls('0x123', '1');

      expect(metadata).toEqual({
        imageSmallUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
        imageMediumUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
      });
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/alchemy-contract-image.png', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetOpenseaMetadata).toHaveBeenCalledTimes(1);
      expect(fnGetAlchemyMetadata).toHaveBeenCalledTimes(1);
    });

    it('finds metadata as default image if contract is listed', async () => {
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: null
      } as OpenseaNft);
      jest.spyOn(axios, 'head').mockResolvedValue({});
      jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue([
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.png',
          'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.png'
        ]);

      const metadata = await service.getImageUrls('0xgondi-1', '1');

      expect(metadata).toEqual({
        imageMediumUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.png',
        imageSmallUrl: 'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.png'
      });
      expect(fnGetMetadata).toHaveBeenCalledTimes(1);
    });

    it('accepts default asset name as string', async () => {
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: null
      } as OpenseaNft);
      jest.spyOn(axios, 'head').mockResolvedValue({});
      jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue([
          'http://object.storage/0xgondi-2-1/small.png',
          'http://object.storage/0xgondi-2-1/medium.png'
        ]);

      const metadata = await service.getImageUrls('0xgondi-2', '1');

      expect(metadata).toEqual({
        imageSmallUrl: 'http://object.storage/0xgondi-2-1/small.png',
        imageMediumUrl: 'http://object.storage/0xgondi-2-1/medium.png'
      });
      expect(fnGetMetadata).toHaveBeenCalledTimes(1);
    });

    it('returns null if no metadata is found', async () => {
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: null
      } as OpenseaNft);

      const metadata = await service.getImageUrls('0x456', '1');
      jest.runOnlyPendingTimers();

      expect(metadata).toEqual({ imageSmallUrl: null, imageMediumUrl: null });
      expect(fnGetMetadata).toHaveBeenCalledTimes(1);
    });

    it('resolves default links after timeout', async () => {
      jest.spyOn(openseaFacade, 'getNft').mockReturnValue(new Promise(() => {}) as Promise<OpenseaNft>);

      const metadataPromise = service.getImageUrls('0x123', '1', { timeoutMs: 1000 });
      await jest.advanceTimersByTimeAsync(1000);

      await expect(metadataPromise).resolves.toEqual({ imageSmallUrl: null, imageMediumUrl: null });
    });

    it('sanitizes ipfs image urls before upload', async () => {
      jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: 'ipfs://bafybeigdyrzt5'
      } as OpenseaNft);
      jest.spyOn(axios, 'head').mockResolvedValue({
        headers: { 'content-type': 'image/png' }
      });
      const fnGetStorageUrls = jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue(['http://object.storage/small.png', 'http://object.storage/medium.png']);

      const metadata = await service.getImageUrls('0x123', '1');

      expect(metadata).toEqual({
        imageSmallUrl: 'http://object.storage/small.png',
        imageMediumUrl: 'http://object.storage/medium.png'
      });
      expect(fnGetStorageUrls).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://ipfs.io/ipfs/bafybeigdyrzt5' }),
        'asset-0x123-1',
        [
          { width: 320, height: 320, name: 'small' },
          { width: 640, height: 640, name: 'medium' }
        ]
      );
    });

    it('does not return links if content type is not supported', async () => {
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: 'https://example.com/document'
      } as OpenseaNft);
      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({
        headers: { 'content-type': 'application/pdf' }
      });
      jest.spyOn(fs, 'rm').mockResolvedValue(null);

      const metadata = await service.getImageUrls('0x999', '1');
      jest.runOnlyPendingTimers();

      expect(metadata).toEqual({ imageMediumUrl: null, imageSmallUrl: null });
      expect(fnGetMetadata).toHaveBeenCalledTimes(1);
      expect(fnFetch).toHaveBeenCalledTimes(2);
    });

    it('does not return opensea storage links if upload fails', async () => {
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        image_url: 'https://example.com/image.png'
      } as OpenseaNft);
      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});

      const result = await service.getImageUrls('0x123', '1');
      jest.runOnlyPendingTimers();

      expect(result).toEqual({ imageSmallUrl: null, imageMediumUrl: null });
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/image.png', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetMetadata).toHaveBeenCalledTimes(1);
    });

    it('returns default null image links and skips external fetches when the pod has no capacity', async () => {
      const guard = (service as unknown as { podResourceGuard: { hasCapacity: jest.Mock } }).podResourceGuard;
      guard.hasCapacity.mockResolvedValueOnce(false);
      const fnGetMetadata = jest.spyOn(openseaFacade, 'getNft');
      const fnAlchemy = jest.spyOn(alchemyFacade, 'getNftMetadata');

      const result = await service.getImageUrls('0x123', '1');

      expect(result).toEqual({ imageMediumUrl: null, imageSmallUrl: null });
      expect(guard.hasCapacity).toHaveBeenCalledWith('asset-image-fetch:0x123#1');
      expect(fnGetMetadata).not.toHaveBeenCalled();
      expect(fnAlchemy).not.toHaveBeenCalled();
    });
  });

  describe(AssetMetadataService.prototype.resolveMissingImageUrls.name, () => {
    it('delegates missing-image resolution with contract placeholder mapping', async () => {
      const resolved = { imageSmallUrl: 'https://example.com/s.png', imageMediumUrl: 'https://example.com/m.png' };
      const fnGetImageUrls = jest.spyOn(service, 'getImageUrls').mockResolvedValue(resolved);
      const fnResolveWithBackoff = jest
        .spyOn(
          service as AssetMetadataService & {
            resolveNullableImageWithFibonacciBackoff: (params: unknown) => Promise<unknown>;
          },
          'resolveNullableImageWithFibonacciBackoff'
        )
        .mockResolvedValue(resolved);

      const result = await service.resolveMissingImageUrls('0xgondi-1', '1');

      expect(result).toEqual(resolved);
      expect(fnResolveWithBackoff).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheKey: 'assets:missing-image:0xgondi-1:1',
          unresolvedValue: { imageSmallUrl: null, imageMediumUrl: null },
          placeholderValue: {
            imageSmallUrl: 'https://app.nftfi.com/ns/assets/gondi-vault.png',
            imageMediumUrl: 'https://app.nftfi.com/ns/assets/gondi-vault.png'
          }
        })
      );

      const backoffParams = fnResolveWithBackoff.mock.calls[0][0] as {
        resolve: () => Promise<typeof resolved>;
        isResolved: (links: { imageSmallUrl: string; imageMediumUrl: string }) => boolean;
      };
      await expect(backoffParams.resolve()).resolves.toEqual(resolved);
      expect(backoffParams.isResolved({ imageSmallUrl: 'https://s', imageMediumUrl: 'https://m' })).toBe(true);
      expect(backoffParams.isResolved({ imageSmallUrl: null, imageMediumUrl: 'https://m' })).toBe(false);
      expect(fnGetImageUrls).toHaveBeenCalledWith('0xgondi-1', '1');
    });

    it('uses configured placeholder when contract default is absent', async () => {
      const resolved = { imageSmallUrl: null, imageMediumUrl: null };
      const fnResolveWithBackoff = jest
        .spyOn(
          service as AssetMetadataService & {
            resolveNullableImageWithFibonacciBackoff: (params: unknown) => Promise<unknown>;
          },
          'resolveNullableImageWithFibonacciBackoff'
        )
        .mockResolvedValue(resolved);

      await service.resolveMissingImageUrls('0xunknown', '2');

      expect(fnResolveWithBackoff).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholderValue: {
            imageSmallUrl: 'https://app.nftfi.com/ns/assets/image-placeholder.png',
            imageMediumUrl: 'https://app.nftfi.com/ns/assets/image-placeholder.png'
          }
        })
      );
    });
  });

  describe(AssetMetadataService.prototype.isAsset.name, () => {
    it('returns true if it is an nft', async () => {
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({} as OpenseaNft);

      const result = await service.isAsset('0x1234567890abcdef1234567890abcdef12345678', '123');

      expect(result).toBeTruthy();
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '123');
    });

    it('returns true when opensea fails but owner can be fetched from contract', async () => {
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('Wrong Nft'));
      const fnGetContract = jest.spyOn(contractService, 'getContractInstance').mockResolvedValue({
        getOwner: jest.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678')
      } as never);

      const result = await service.isAsset('0x1234567890abcdef1234567890abcdef12345678', '123');

      expect(result).toBeTruthy();
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '123');
      expect(fnGetContract).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('returns false if both opensea and contract lookup fail', async () => {
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('Wrong Nft'));
      const fnGetContract = jest
        .spyOn(contractService, 'getContractInstance')
        .mockRejectedValue(new Error('Contract is not available'));

      const result = await service.isAsset('0x1234567890abcdef1234567890abcdef12345678', '123');

      expect(result).toBeFalsy();
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '123');
      expect(fnGetContract).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });
  });
});
