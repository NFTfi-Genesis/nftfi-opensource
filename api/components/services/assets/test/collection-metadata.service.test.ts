import fs from 'fs/promises';
import axios from 'axios';
import { File } from '@google-cloud/storage';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthModule } from '@nftfi.api/modules/health';
import { NftPriceFloorFacade, NpfProject } from '@nftfi.api/facades/nft-price-floor';
import { OpenSeaFacade, OpenseaNft, OpenseaCollection, OpenseaContractMetadata } from '@nftfi.api/facades/opensea';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { MediaProcessorService } from '../src/media-processor.service';
import { CollectionMetadataService } from '../src/collection/collection-metadata.service';
import { AssetContract, AssetContractType } from '../src/asset-contract';
import { MetadataService } from '../src/metadata.service';
import { PodResourceGuardService } from '../src/pod-resource-guard.service';

jest.mock('fs/promises');

describe(CollectionMetadataService.name, () => {
  let service: CollectionMetadataService;
  let openseaFacade: OpenSeaFacade;
  let imageService: MediaProcessorService;
  let objectStorageFacade: GcpStorageFacade;
  let contractService: AssetContract;
  let npfFacade: NftPriceFloorFacade;

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
                project: {
                  small: {
                    maxHeight: 320,
                    maxWidth: 320
                  },
                  medium: {
                    maxHeight: 640,
                    maxWidth: 640
                  }
                },
                placeholder: {
                  '0x123': 'https://app.nftfi.com/ns/assets/image-placeholder.png'
                }
              }
            })
          ]
        })
      ],
      providers: [
        CollectionMetadataService,
        {
          provide: OpenSeaFacade,
          useValue: {
            getNft: jest.fn(),
            getContract: jest.fn(),
            getCollectionBySlug: jest.fn(),
            iterateOverNftsByContract: jest.fn()
          }
        },
        {
          provide: NftPriceFloorFacade,
          useValue: { iterateProjects: jest.fn() }
        },
        {
          provide: AssetContract,
          useValue: { getContractInstance: jest.fn() }
        },
        {
          provide: MediaProcessorService,
          useValue: { loadAndResize: jest.fn() }
        },
        {
          provide: GcpStorageFacade,
          useValue: { upload: jest.fn() }
        },
        {
          provide: PodResourceGuardService,
          useValue: { hasCapacity: jest.fn().mockResolvedValue(true) }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(CollectionMetadataService);
    openseaFacade = moduleRef.get(OpenSeaFacade);
    imageService = moduleRef.get(MediaProcessorService);
    objectStorageFacade = moduleRef.get(GcpStorageFacade);
    contractService = moduleRef.get(AssetContract);
    npfFacade = moduleRef.get(NftPriceFloorFacade);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
  });

  describe(CollectionMetadataService.prototype.getImageUrl.name, () => {
    it('finds metadata on Alchemy', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetNftMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        collection: 'test-collection'
      } as OpenseaNft);
      const fnGetCollectionMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        image_url: 'https://example.com/image.jpg'
      } as OpenseaCollection);
      jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue(['http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg']);
      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});

      const metadata = await service.getImageUrl('0x123', '1');
      jest.runOnlyPendingTimers();

      expect(metadata).toEqual('http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg');
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetNftMetadata).toHaveBeenCalledWith('0x123', '1');
      expect(fnGetCollectionMetadata).toHaveBeenCalledWith('test-collection');
    });

    it('returns empty string if image URL request fails', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetNftMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        collection: 'test-collection'
      } as OpenseaNft);
      const fnGetCollectionMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        image_url: 'https://example.com/image.jpg'
      } as OpenseaCollection);
      jest.spyOn(service as CollectionMetadataService & { verifyUrl: jest.Mock }, 'verifyUrl').mockResolvedValue(false);
      const fnRm = jest.spyOn(fs, 'rm').mockResolvedValue(null);
      const fnResize = jest.spyOn(imageService, 'loadAndResize').mockResolvedValue('/tmp/resized-image.jpg');
      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});
      const fnUpload = jest.spyOn(objectStorageFacade, 'upload');

      const metadata = await service.getImageUrl('0x123', '1');
      jest.runOnlyPendingTimers();

      expect(metadata).toEqual(null);
      expect(fnFetch).not.toHaveBeenCalled();
      expect(fnGetNftMetadata).toHaveBeenCalledWith('0x123', '1');
      expect(fnGetCollectionMetadata).toHaveBeenCalledWith('test-collection');
      expect(fnRm).not.toHaveBeenCalled();
      expect(fnUpload).not.toHaveBeenCalled();
      expect(fnResize).not.toHaveBeenCalled();
    });

    it('returns empty string if image upload fails', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetNftMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        collection: 'test-collection'
      } as OpenseaNft);
      const fnGetCollectionMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        image_url: 'https://example.com/image.jpg'
      } as OpenseaCollection);
      jest.spyOn(MetadataService.prototype, 'getStorageUrls').mockRejectedValue(new Error('Upload failed'));
      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});

      const metadata = await service.getImageUrl('0x789', 'token-1');

      expect(metadata).toEqual(null);
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetNftMetadata).toHaveBeenCalledWith('0x789', 'token-1');
      expect(fnGetCollectionMetadata).toHaveBeenCalledWith('test-collection');
    });

    it('returns empty string if image URL is invalid', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetNftMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        collection: 'test-collection'
      } as OpenseaNft);
      const fnGetCollectionMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        image_url: 'http://invalid-url.jpg'
      } as OpenseaCollection);
      jest.spyOn(MetadataService.prototype, 'getStorageUrls').mockRejectedValue(new Error('Invalid URL'));
      const fnFetch = jest.spyOn(axios, 'head').mockRejectedValue(new Error('Invalid URL'));

      const metadata = await service.getImageUrl('0x789', 'token-1');

      expect(metadata).toEqual(null);
      expect(fnFetch).toHaveBeenCalledWith('http://invalid-url.jpg', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
      expect(fnGetNftMetadata).toHaveBeenCalledWith('0x789', 'token-1');
      expect(fnGetCollectionMetadata).toHaveBeenCalledWith('test-collection');
    });

    it('skips image if not found', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      const fnGetNftMetadata = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        collection: 'test-collection'
      } as OpenseaNft);
      const fnGetCollectionMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        image_url: null
      } as OpenseaCollection);
      const fnRm = jest.spyOn(fs, 'rm').mockResolvedValue(null);
      const fnResize = jest.spyOn(imageService, 'loadAndResize').mockResolvedValue('/tmp/resized-image.jpg');
      const fnFetch = jest.spyOn(axios, 'head').mockResolvedValue({});
      const fnUpload = jest.spyOn(objectStorageFacade, 'upload').mockResolvedValueOnce([
        ,
        {
          publicUrl: jest
            .fn()
            .mockReturnValue('http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg')
        } as unknown as File
      ]);

      const metadata = await service.getImageUrl('0x123', 'token-1');
      jest.runOnlyPendingTimers();

      expect(metadata).toEqual(null);
      expect(fnFetch).not.toHaveBeenCalled();
      expect(fnGetNftMetadata).toHaveBeenCalledWith('0x123', 'token-1');
      expect(fnGetCollectionMetadata).toHaveBeenCalledWith('test-collection');
      expect(fnRm).not.toHaveBeenCalled();
      expect(fnUpload).not.toHaveBeenCalled();
      expect(fnResize).not.toHaveBeenCalled();
    });

    it('returns empty string on timeout', async () => {
      jest.spyOn(openseaFacade, 'getNft').mockReturnValue(new Promise(() => {}) as Promise<OpenseaNft>);

      const metadataPromise = service.getImageUrl('0x123', '1', { timeoutMs: 1000 });
      await jest.advanceTimersByTimeAsync(1000);

      await expect(metadataPromise).resolves.toEqual(null);
    });

    it('clears timeout when request fails before timeout expires', async () => {
      const fnClearTimeout = jest.spyOn(global, 'clearTimeout');
      jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('boom'));

      const metadata = await service.getImageUrl('0x123', '1', { timeoutMs: 10_000 });

      expect(metadata).toEqual(null);
      expect(fnClearTimeout).toHaveBeenCalled();
    });

    it('sanitizes ipfs collection image URLs', async () => {
      jest.spyOn(fs, 'mkdir').mockResolvedValue(null);
      jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({
        collection: 'test-collection'
      } as OpenseaNft);
      jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        image_url: 'ipfs://bafybeigdyrzt5'
      } as OpenseaCollection);
      jest.spyOn(axios, 'head').mockResolvedValue({ headers: { 'content-type': 'image/png' } });
      const fnGetStorageUrls = jest
        .spyOn(MetadataService.prototype, 'getStorageUrls')
        .mockResolvedValue(['http://object.storage/collection-0x123-1/small.jpeg']);

      const metadata = await service.getImageUrl('0x123', '1');

      expect(metadata).toEqual('http://object.storage/collection-0x123-1/small.jpeg');
      expect(fnGetStorageUrls).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://ipfs.io/ipfs/bafybeigdyrzt5' }),
        'collection-0x123-1',
        [{ width: 320, height: 320, name: 'small' }]
      );
    });

    it('returns null and skips external fetches when the pod has no capacity', async () => {
      const guard = (service as unknown as { podResourceGuard: { hasCapacity: jest.Mock } }).podResourceGuard;
      guard.hasCapacity.mockResolvedValueOnce(false);
      const fnGetNft = jest.spyOn(openseaFacade, 'getNft');

      const result = await service.getImageUrl('0x123', '1');

      expect(result).toEqual(null);
      expect(guard.hasCapacity).toHaveBeenCalledWith('collection-image-fetch:0x123#1');
      expect(fnGetNft).not.toHaveBeenCalled();
    });
  });

  describe(CollectionMetadataService.prototype.getName.name, () => {
    it('returns name from opensea', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);
      const getGetCollection = jest
        .spyOn(openseaFacade, 'getCollectionBySlug')
        .mockResolvedValue({ name: 'Test Collection' } as OpenseaCollection);

      const name = await service.getName('0x123', 'token-1');

      expect(name).toEqual('Test Collection');
      expect(getGetNft).toHaveBeenCalledWith('0x123', 'token-1');
      expect(getGetCollection).toHaveBeenCalledWith('test-collection');
    });

    it('handles error and returns contract as default name', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);
      const getGetCollection = jest
        .spyOn(openseaFacade, 'getCollectionBySlug')
        .mockRejectedValue(new Error('Collection not found'));

      const name = await service.getName('0x456', 'token-2');

      expect(name).toEqual('0x456');
      expect(getGetNft).toHaveBeenCalledWith('0x456', 'token-2');
      expect(getGetCollection).toHaveBeenCalledWith('test-collection');
    });

    it('returns contract if collection slug is not found', async () => {
      const getGetNft = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue({ collection: '' } as OpenseaNft);
      const getGetCollection = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue(null);

      const name = await service.getName('0x789', 'token-3');

      expect(name).toEqual('0x789');
      expect(getGetNft).toHaveBeenCalledWith('0x789', 'token-3');
      expect(getGetCollection).not.toHaveBeenCalled();
    });

    it('returns empty string if name field is blank', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);
      const getGetCollection = jest
        .spyOn(openseaFacade, 'getCollectionBySlug')
        .mockResolvedValue({ name: '' } as OpenseaCollection);

      const name = await service.getName('0x123', 'token-4');

      expect(name).toEqual('');
      expect(getGetNft).toHaveBeenCalledWith('0x123', 'token-4');
      expect(getGetCollection).toHaveBeenCalledWith('test-collection');
    });
  });

  describe(CollectionMetadataService.prototype.getOpenseaSlug.name, () => {
    it('returns slug from OpenSea', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);

      const slug = await service.getOpenseaSlug('0x123', '1');

      expect(slug).toEqual('test-collection');
      expect(getGetNft).toHaveBeenCalledWith('0x123', '1');
    });

    it('returns null if slug not found', async () => {
      const getGetNft = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue(null);

      const slug = await service.getOpenseaSlug('0x456', '1');

      expect(slug).toBeNull();
      expect(getGetNft).toHaveBeenCalledWith('0x456', '1');
    });
  });

  describe(CollectionMetadataService.prototype.getTokenStandard.name, () => {
    it('returns erc721 token standard from opensea', async () => {
      const fnGetContract = jest.spyOn(contractService, 'getContractInstance');
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getContract').mockResolvedValue({
        contract_standard: 'erc721'
      } as unknown as OpenseaContractMetadata);

      const result = await service.getTokenStandard('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual(TokenStandard.ERC721);
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnGetContract).not.toHaveBeenCalled();
    });

    it('returns erc1155 token standard from opensea', async () => {
      const fnGetContract = jest.spyOn(contractService, 'getContractInstance');
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getContract').mockResolvedValue({
        contract_standard: 'erc1155'
      } as unknown as OpenseaContractMetadata);

      const result = await service.getTokenStandard('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual(TokenStandard.ERC1155);
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnGetContract).not.toHaveBeenCalled();
    });

    it('returns Punks token standard from opensea', async () => {
      const fnGetContract = jest.spyOn(contractService, 'getContractInstance');
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getContract').mockResolvedValue({
        contract_standard: 'cryptopunks'
      } as unknown as OpenseaContractMetadata);

      const result = await service.getTokenStandard('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual(TokenStandard.Punks);
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnGetContract).not.toHaveBeenCalled();
    });

    it('calls contract service for unknown token standard', async () => {
      const fnGetContract = jest.spyOn(contractService, 'getContractInstance').mockResolvedValue({
        tokenStandard: TokenStandard.ERC721
      } as unknown as AssetContractType);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getContract').mockResolvedValue(null);

      const result = await service.getTokenStandard('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual(TokenStandard.ERC721);
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnGetContract).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('falls back to contract service if opensea lookup throws', async () => {
      const fnGetContract = jest.spyOn(contractService, 'getContractInstance').mockResolvedValue({
        tokenStandard: TokenStandard.ERC1155
      } as unknown as AssetContractType);
      const fnGetOpenseaMetadata = jest
        .spyOn(openseaFacade, 'getContract')
        .mockRejectedValue(new Error('opensea down'));

      const result = await service.getTokenStandard('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual(TokenStandard.ERC1155);
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(fnGetContract).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe(CollectionMetadataService.prototype.getSlugsAndRanges.name, () => {
    it('returns slugs and ranges from OpenSea', async () => {
      const fnIterateOverNftsByContract = jest
        .spyOn(openseaFacade, 'iterateOverNftsByContract')
        .mockImplementation(async function* () {
          yield [
            { identifier: '1', collection: 'test-collection-1' },
            { identifier: '0', collection: 'test-collection-1' },
            { identifier: '999', collection: 'test-collection-1' },
            { identifier: '1000', collection: 'test-collection-2' },
            { identifier: '1999', collection: 'test-collection-2' }
          ] as OpenseaNft[];
        });

      const slugs = await service.getSlugsAndRanges('0x1234567890abcdef1234567890abcdef12345678');

      expect(slugs).toEqual({ 'test-collection-1': ['0', '999'], 'test-collection-2': ['1000', '1999'] });
      expect(fnIterateOverNftsByContract).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', {
        limit: 100
      });
    });

    it('extends ranges across multiple pages', async () => {
      const fnIterateOverNftsByContract = jest
        .spyOn(openseaFacade, 'iterateOverNftsByContract')
        .mockImplementation(async function* () {
          yield [
            { identifier: '5', collection: 'test-collection' },
            { identifier: '2', collection: 'test-collection' }
          ] as OpenseaNft[];
          yield [{ identifier: '7', collection: 'test-collection' }] as OpenseaNft[];
        });

      const slugs = await service.getSlugsAndRanges('0xabc');

      expect(slugs).toEqual({ 'test-collection': ['2', '7'] });
      expect(fnIterateOverNftsByContract).toHaveBeenCalledWith('0xabc', { limit: 100 });
    });
  });

  describe(CollectionMetadataService.prototype.getNpfSlug.name, () => {
    it('returns slug for forwarded collection without range', async () => {
      const fnGetForwardedCollections = jest
        .spyOn(service['configService'], 'get')
        .mockReturnValue(new Map([['test-collection', ['0x1234567890abcdef1234567890abcdef12345678']]]));

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual('test-collection');
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
    });

    it('returns slug for forwarded ranged collection', async () => {
      const fnGetForwardedCollections = jest
        .spyOn(service['configService'], 'get')
        .mockReturnValue(new Map([['test-collection', ['0x1234567890abcdef1234567890abcdef12345678:0:999']]]));

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual('test-collection');
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
    });

    it('falls back to npf projects if forwarded ranges do not match', async () => {
      const fnGetForwardedCollections = jest
        .spyOn(service['configService'], 'get')
        .mockReturnValue(new Map([['test-collection', ['0x1234567890abcdef1234567890abcdef12345678:0:1']]]));
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [
          { slug: 'npf-collection', providerCollectionId: '0x1234567890abcdef1234567890abcdef12345678:0:999' }
        ] as NpfProject[];
      });

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '10');

      expect(slug).toEqual('npf-collection');
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
    });

    it('checks npf projects for slug if providerCollectionId matches', async () => {
      const fnGetForwardedCollections = jest.spyOn(service['configService'], 'get').mockReturnValue(new Map());
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [
          { slug: 'test-collection', providerCollectionId: '0x1234567890abcdef1234567890abcdef12345678:0:9999' }
        ] as NpfProject[];
      });

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual('test-collection');
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
    });

    it('checks npf projects for slug if stats.marketplaceSlug matches', async () => {
      const fnGetForwardedCollections = jest.spyOn(service['configService'], 'get').mockReturnValue(new Map());
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [
          {
            slug: 'test-collection',
            stats: { floorInfo: { marketplaceSlug: '0x1234567890abcdef1234567890abcdef12345678' } }
          }
        ] as NpfProject[];
      });

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual('test-collection');
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
    });

    it('returns null if no slug found', async () => {
      const fnGetForwardedCollections = jest.spyOn(service['configService'], 'get').mockReturnValue(new Map());
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [
          {
            slug: 'test-collection',
            providerCollectionId: null,
            stats: { floorInfo: { marketplaceSlug: null } }
          }
        ] as NpfProject[];
      });

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toBeNull();
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
    });

    it('skips opensea check if provider is parsed', async () => {
      const fnGetForwardedCollections = jest.spyOn(service['configService'], 'get').mockReturnValue(new Map());
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [
          { slug: 'npf-slug', providerCollectionId: '0x9874567890abcdef1234567890abcdef12345678:1:1000' }
        ] as NpfProject[];
      });
      const fnGetOpenseaContract = jest.spyOn(openseaFacade, 'getCollectionBySlug');

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual(null);
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
      expect(fnGetOpenseaContract).not.toHaveBeenCalled();
    });

    it('resolves if provider id is opensea slug', async () => {
      const fnGetForwardedCollections = jest.spyOn(service['configService'], 'get').mockReturnValue(new Map());
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [{ slug: 'npf-slug', providerCollectionId: 'opensea-slug' }] as NpfProject[];
      });
      const fnGetOpenseaContract = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        contracts: [{ address: '0x1234567890abcdef1234567890abcdef12345678' }]
      } as OpenseaCollection);

      const slug = await service.getNpfSlug('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual('npf-slug');
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
      expect(fnGetOpenseaContract).toHaveBeenCalledWith('opensea-slug');
    });

    it('skips if provider is an opensea slug and not matched', async () => {
      const fnGetForwardedCollections = jest.spyOn(service['configService'], 'get').mockReturnValue(new Map());
      const fnIterateProjects = jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(async function* () {
        yield [{ slug: 'npf-slug', providerCollectionId: 'opensea-slug' }] as NpfProject[];
      });
      const fnGetOpenseaContract = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        contracts: [{ address: '0x1234567890abcdef1234567890abcdef12345678' }]
      } as OpenseaCollection);

      const slug = await service.getNpfSlug('0x9874567890abcdef1234567890abcdef12345678', '1');

      expect(slug).toEqual(null);
      expect(fnIterateProjects).toHaveBeenCalled();
      expect(fnGetForwardedCollections).toHaveBeenCalledWith('npf.forwardedCollections');
      expect(fnGetOpenseaContract).toHaveBeenCalledWith('opensea-slug');
    });
  });

  describe(CollectionMetadataService.prototype.getDefaultTokenRange.name, () => {
    it('creates default token range', async () => {
      const range = service.getDefaultTokenRange('1');

      expect(range).toEqual(['1', '1']);
    });
  });

  describe(CollectionMetadataService.prototype.resolveMissingImageUrl.name, () => {
    it('delegates missing-image resolution with collection placeholder', async () => {
      const fnGetImageUrl = jest.spyOn(service, 'getImageUrl').mockResolvedValue('https://example.com/collection.png');
      const fnResolveWithBackoff = jest
        .spyOn(
          service as CollectionMetadataService & {
            resolveNullableImageWithFibonacciBackoff: (params: unknown) => Promise<unknown>;
          },
          'resolveNullableImageWithFibonacciBackoff'
        )
        .mockResolvedValue('https://example.com/collection.png');

      const result = await service.resolveMissingImageUrl('0x123', '1');

      expect(result).toEqual('https://example.com/collection.png');
      expect(fnResolveWithBackoff).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheKey: 'collections:missing-image:0x123:1',
          unresolvedValue: null,
          placeholderValue: 'https://app.nftfi.com/ns/assets/image-placeholder.png'
        })
      );

      const backoffParams = fnResolveWithBackoff.mock.calls[0][0] as {
        resolve: () => Promise<string>;
        isResolved: (url: string) => boolean;
      };
      await expect(backoffParams.resolve()).resolves.toEqual('https://example.com/collection.png');
      expect(backoffParams.isResolved('https://example.com/collection.png')).toBe(true);
      expect(backoffParams.isResolved(null)).toBe(false);
      expect(fnGetImageUrl).toHaveBeenCalledWith('0x123', '1');
    });
  });

  describe(CollectionMetadataService.prototype.getReleasedAt.name, () => {
    it('returns releasedAt from opensea metadata', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        created_date: '2023-01-01T00:00:00Z'
      } as OpenseaCollection);

      const releasedAt = await service.getReleasedAt('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(releasedAt).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('test-collection');
      expect(getGetNft).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '1');
    });

    it('returns default date if opensea metadata not found', async () => {
      const getGetNft = jest.spyOn(openseaFacade, 'getNft').mockRejectedValue(new Error('VM error'));
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        created_date: '2022-01-01T00:00:00Z'
      } as OpenseaCollection);
      const releasedAt = await service.getReleasedAt('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(releasedAt).toEqual(new Date('2022-01-01T00:00:00Z'));
      expect(fnGetOpenseaMetadata).not.toHaveBeenCalled();
      expect(getGetNft).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '1');
    });

    it('returns default date if slug cannot be resolved', async () => {
      const getGetNft = jest.spyOn(openseaFacade, 'getNft').mockResolvedValue(null);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug');

      const releasedAt = await service.getReleasedAt('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(releasedAt).toEqual(new Date('2022-01-01'));
      expect(fnGetOpenseaMetadata).not.toHaveBeenCalled();
      expect(getGetNft).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '1');
    });

    it('returns default date if releasedAt not found on opensea', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue({
        created_date: null
      } as OpenseaCollection);

      const releasedAt = await service.getReleasedAt('0x1234567890abcdef1234567890abcdef12345678', '1');

      expect(releasedAt).toEqual(new Date('2022-01-01'));
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('test-collection');
      expect(getGetNft).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '1');
    });

    it('returns default date if opensea metadata not found', async () => {
      const getGetNft = jest
        .spyOn(openseaFacade, 'getNft')
        .mockResolvedValue({ collection: 'test-collection' } as OpenseaNft);
      const fnGetOpenseaMetadata = jest.spyOn(openseaFacade, 'getCollectionBySlug').mockResolvedValue(null);

      const releasedAt = await service.getReleasedAt('0x1234567890abcdef1234567890abcdef12345678', '3000');

      expect(releasedAt).toEqual(new Date('2022-01-01'));
      expect(fnGetOpenseaMetadata).toHaveBeenCalledWith('test-collection');
      expect(getGetNft).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '3000');
    });
  });

  describe(CollectionMetadataService.prototype.getNpfSlug.name, () => {
    it('logs and returns null when NPF lookup fails', async () => {
      jest.spyOn(npfFacade, 'iterateProjects').mockImplementation(() => {
        throw new Error('npf unavailable');
      });

      const slug = await service.getNpfSlug('0xabc', '1');

      expect(slug).toBeNull();
    });
  });

  describe(CollectionMetadataService.prototype.isSupportedTokenStandard.name, () => {
    it('returns true if it is a supported token standard', async () => {
      const fnGetTokenStandard = jest.spyOn(service, 'getTokenStandard').mockResolvedValue(TokenStandard.ERC721);

      const result = await service.isSupportedTokenStandard('0x123');

      expect(result).toBeTruthy();
      expect(fnGetTokenStandard).toHaveBeenCalledWith('0x123');
    });

    it('returns false if it is a non supported token standard', async () => {
      const fnGetTokenStandard = jest.spyOn(service, 'getTokenStandard').mockResolvedValue('Unknown' as TokenStandard);

      const result = await service.isSupportedTokenStandard('0x123');

      expect(result).toBeFalsy();
      expect(fnGetTokenStandard).toHaveBeenCalledWith('0x123');
    });

    it('returns false if contract checker throws an error', async () => {
      const fnGetTokenStandard = jest
        .spyOn(service, 'getTokenStandard')
        .mockRejectedValue(new Error('Wrong Collection'));

      const result = await service.isSupportedTokenStandard('0x123');

      expect(result).toBeFalsy();
      expect(fnGetTokenStandard).toHaveBeenCalledWith('0x123');
    });
  });
});
