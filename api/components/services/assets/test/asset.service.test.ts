import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Mutex } from 'redis-semaphore';
import { CollectionAssetRepository } from '@nftfi.api/repositories/postgres/collection-asset';
import { buildCollectionAssetEntity as buildCollectionAsset } from '@nftfi.api/repositories/postgres/factories/collection-asset';
import { Collection, TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { HealthService } from '@nftfi.api/modules/health';
import { AlchemyFacade } from '@nftfi.api/facades/alchemy';
import type { AlchemyShrunkNft } from '@nftfi.api/facades/alchemy/alchemy.types';
import { AssetsFacade, AssetProjection, CollectionProjection } from '@nftfi.api/facades/assets';
import { AssetService } from '../src/asset/asset.service';
import { AssetMetadataService } from '../src/asset/asset-metadata.service';
import { buildCollectionDto } from './factories/collection.dto.factory';
import { buildAssetDto } from './factories';

jest.mock('redis-semaphore');

describe(AssetService.name, () => {
  let service: AssetService;
  let assetRepository: CollectionAssetRepository;
  let metadataService: AssetMetadataService;
  let assetsFacade: AssetsFacade;
  let alchemyFacade: AlchemyFacade;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => void 0);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            (): object => ({
              nftFloorPrice: {
                url: process.env.NFT_FLOOR_PRICE_URL,
                apiKey: process.env.NFT_FLOOR_PRICE_API_KEY,
                collections: new Map<string, string[]>()
                  .set('cryptopunks', [
                    '0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6',
                    '0x000000000000003607fce1aC9e043a86675C5C2F'
                  ])
                  .set('siphon-by-xcopy', ['0x905e7E152ecD7315f03d8D671578Ea72684Cca99'])
              }
            })
          ]
        })
      ],
      providers: [
        AssetService,
        {
          provide: AssetMetadataService,
          useValue: {
            getName: jest.fn(),
            getImageUrls: jest.fn(),
            resolveMissingImageUrls: jest.fn(),
            getOwners: jest.fn(),
            isLinkValid: jest.fn().mockResolvedValue(true),
            isAsset: jest.fn()
          }
        },
        {
          provide: CollectionAssetRepository,
          useValue: {
            createMany: jest.fn(),
            create: jest.fn(),
            findByKey: jest.fn(),
            findByKeys: jest.fn(),
            find: jest.fn(),
            updateByIds: jest.fn(),
            iterateOverEmptyImageEntries: jest.fn().mockImplementation(async function* () {
              yield [];
            }),
            iterateOverNonEmptyImageEntries: jest.fn().mockImplementation(async function* () {
              yield [];
            })
          }
        },
        {
          provide: AssetsFacade,
          useValue: {
            getCollectionByKey: jest.fn(),
            getCollections: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: AlchemyFacade,
          useValue: {
            iterateOverNftsByAccount: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                get: jest.fn(),
                set: jest.fn(),
                del: jest.fn()
              }
            }
          }
        },
        {
          provide: HealthService,
          useValue: {
            on: jest.fn(),
            off: jest.fn(),
            onApplicationShutdown: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AssetService);
    assetRepository = moduleRef.get(CollectionAssetRepository);
    metadataService = moduleRef.get(AssetMetadataService);
    assetsFacade = moduleRef.get(AssetsFacade);
    alchemyFacade = moduleRef.get(AlchemyFacade);
  });

  describe(AssetService.prototype.getByKey.name, () => {
    it('returns asset', async () => {
      const asset = buildCollectionAsset({
        id: 1,
        collection: { id: 1 } as Collection,
        tokenId: '1'
      });

      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      jest.spyOn(metadataService, 'isAsset').mockResolvedValue(true);
      jest.spyOn(assetRepository, 'findByKey').mockResolvedValue(asset);
      jest.spyOn(assetsFacade, 'getCollectionByKey').mockResolvedValue(buildCollectionDto({ id: 1 }));
      jest.spyOn(metadataService, 'getImageUrls').mockResolvedValue({
        imageMediumUrl: 'https://example.com/image-medium.png',
        imageSmallUrl: 'https://example.com/image-small.png'
      });
      jest.spyOn(metadataService, 'getName').mockResolvedValue('Test Asset');

      const result = await service.getByKey('0x123', '1');
      expect(result).toEqual({
        id: 1,
        tokenId: '1',
        contract: '0x123',
        name: 'Test Asset',
        imageMediumUrl: 'https://example.com/image-medium.png',
        imageSmallUrl: 'https://example.com/image-small.png',
        collection: { id: 1 } as Collection,
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z')
      });
    });

    it('returns existing asset without fetching metadata', async () => {
      const asset = buildCollectionAsset({
        id: 2,
        contract: '0xabc',
        tokenId: '9'
      });

      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      jest.spyOn(assetRepository, 'findByKey').mockResolvedValue(asset);
      const fnIsAsset = jest.spyOn(metadataService, 'isAsset');
      const fnGetCollection = jest.spyOn(assetsFacade, 'getCollectionByKey');
      const fnGetImageUrls = jest.spyOn(metadataService, 'getImageUrls');
      const fnGetName = jest.spyOn(metadataService, 'getName');

      const result = await service.getByKey('0xabc', '9');

      expect(result).toBe(asset);
      expect(fnIsAsset).not.toHaveBeenCalled();
      expect(fnGetCollection).not.toHaveBeenCalled();
      expect(fnGetImageUrls).not.toHaveBeenCalled();
      expect(fnGetName).not.toHaveBeenCalled();
    });

    it('should create new collection and asset if not found', async () => {
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      jest.spyOn(metadataService, 'isAsset').mockResolvedValue(true);
      jest.spyOn(assetRepository, 'findByKey').mockResolvedValue(null);
      const fnGetName = jest.spyOn(metadataService, 'getName').mockResolvedValue('Test Asset');
      jest.spyOn(assetsFacade, 'getCollectionByKey').mockResolvedValue(buildCollectionDto({ id: 1 }));
      jest
        .spyOn(assetRepository, 'create')
        .mockResolvedValue(buildCollectionAsset({ collection: { id: 1 } as Collection, tokenId: '1' }));

      const result = await service.getByKey('0x123', '1');
      expect(result.tokenId).toBe('1');
      expect(fnGetName).toHaveBeenCalledWith('0x123', '1');
    });

    it('returns null if collection for this asset is not found', async () => {
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      jest.spyOn(metadataService, 'isAsset').mockResolvedValue(true);
      jest.spyOn(assetRepository, 'findByKey').mockResolvedValue(null);
      jest.spyOn(assetsFacade, 'getCollectionByKey').mockResolvedValue(null);
      const fnCreate = jest.spyOn(assetRepository, 'create');
      const fnGetName = jest.spyOn(metadataService, 'getName');

      const result = await service.getByKey('0x123', '1');
      expect(result).toBeNull();
      expect(fnCreate).not.toHaveBeenCalled();
      expect(fnGetName).not.toHaveBeenCalled();
    });

    it('skips collection creation if it is not an asset', async () => {
      jest.spyOn(Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
      jest.spyOn(Mutex.prototype, 'release').mockResolvedValue();
      jest.spyOn(metadataService, 'isAsset').mockResolvedValue(false);
      jest.spyOn(assetRepository, 'findByKey').mockResolvedValue(null);
      const fnGetName = jest.spyOn(metadataService, 'getName').mockResolvedValue('Test Asset');
      jest.spyOn(assetsFacade, 'getCollectionByKey').mockResolvedValue(buildCollectionDto({ id: 1 }));
      jest
        .spyOn(assetRepository, 'create')
        .mockResolvedValue(buildCollectionAsset({ collection: { id: 1 } as Collection, tokenId: '1' }));

      const result = await service.getByKey('0x123', '1');

      expect(result).toBe(null);
      expect(fnGetName).not.toHaveBeenCalled();
    });
  });

  describe(AssetService.prototype.getByKeys.name, () => {
    it('returns empty when no keys provided', async () => {
      const fnFind = jest.spyOn(assetRepository, 'findByKeys');
      const fnGetByKey = jest.spyOn(service, 'getByKey');

      const result = await service.getByKeys([], { skip: 0, limit: 10, whitelisted: undefined });

      expect(result).toEqual([]);
      expect(fnFind).not.toHaveBeenCalled();
      expect(fnGetByKey).not.toHaveBeenCalled();
    });

    it('reuses existing assets and skips non-whitelisted when requested', async () => {
      const existing = buildCollectionAsset({
        contract: '0xabc',
        tokenId: '1',
        collection: { id: 1, whitelisted: false } as unknown as Collection
      });
      const fetched = buildCollectionAsset({
        contract: '0xdef',
        tokenId: '2',
        collection: { id: 2, whitelisted: true } as unknown as Collection
      });
      jest.spyOn(assetRepository, 'findByKeys').mockResolvedValue([existing]);
      const fnGetByKey = jest.spyOn(service, 'getByKey').mockResolvedValue(fetched);

      const result = await service.getByKeys(
        [
          { contract: '0xabc', tokenId: '1' },
          { contract: '0xdef', tokenId: '2' }
        ],
        { whitelisted: true, skip: 0, limit: 10 }
      );

      expect(result).toEqual([fetched]);
      expect(fnGetByKey).toHaveBeenCalledWith('0xdef', '2');
      expect(assetRepository.findByKeys).toHaveBeenCalledWith([
        { contract: '0xabc', tokenId: '1' },
        { contract: '0xdef', tokenId: '2' }
      ]);
    });

    it('skips fetched assets when whitelist does not match', async () => {
      jest.spyOn(assetRepository, 'findByKeys').mockResolvedValue([]);
      const fetched = buildCollectionAsset({
        contract: '0xabc',
        tokenId: '1',
        collection: { id: 1, whitelisted: false } as unknown as Collection
      });
      const fnGetByKey = jest.spyOn(service, 'getByKey').mockResolvedValue(fetched);

      const result = await service.getByKeys([{ contract: '0xabc', tokenId: '1' }], {
        whitelisted: true,
        skip: 0,
        limit: 10
      });

      expect(result).toEqual([]);
      expect(fnGetByKey).toHaveBeenCalledWith('0xabc', '1');
    });

    it('applies skip to repository query and iteration window', async () => {
      const existing = buildCollectionAsset({
        contract: '0xskip',
        tokenId: '2',
        collection: { id: 2, whitelisted: true } as unknown as Collection
      });
      const fetched = buildCollectionAsset({
        contract: '0xskip',
        tokenId: '3',
        collection: { id: 3, whitelisted: true } as unknown as Collection
      });
      jest.spyOn(assetRepository, 'findByKeys').mockResolvedValue([existing]);
      const fnGetByKey = jest.spyOn(service, 'getByKey').mockResolvedValue(fetched);

      const keys = [
        { contract: '0xskip', tokenId: '1' },
        { contract: '0xskip', tokenId: '2' },
        { contract: '0xskip', tokenId: '3' }
      ];
      const result = await service.getByKeys(keys, { whitelisted: undefined, skip: 1, limit: 2 });

      expect(assetRepository.findByKeys).toHaveBeenCalledWith([
        { contract: '0xskip', tokenId: '2' },
        { contract: '0xskip', tokenId: '3' }
      ]);
      expect(fnGetByKey).toHaveBeenCalledTimes(1);
      expect(fnGetByKey).toHaveBeenCalledWith('0xskip', '3');
      expect(result).toEqual([existing, fetched]);
    });

    it('stops once limit is reached', async () => {
      jest.spyOn(assetRepository, 'findByKeys').mockResolvedValue([]);
      const fetched = buildCollectionAsset({
        contract: '0xlimit',
        tokenId: '1',
        collection: { id: 1, whitelisted: true } as unknown as Collection
      });
      const fnGetByKey = jest.spyOn(service, 'getByKey').mockResolvedValue(fetched);

      const keys = [
        { contract: '0xlimit', tokenId: '1' },
        { contract: '0xlimit', tokenId: '2' }
      ];
      const result = await service.getByKeys(keys, { whitelisted: undefined, skip: 0, limit: 1 });

      expect(assetRepository.findByKeys).toHaveBeenCalledWith(keys);
      expect(fnGetByKey).toHaveBeenCalledTimes(1);
      expect(fnGetByKey).toHaveBeenCalledWith('0xlimit', '1');
      expect(result).toEqual([fetched]);
    });
  });

  describe(AssetService.prototype.getByWallet.name, () => {
    it('iterates Alchemy NFTs respecting skip and limit', async () => {
      jest
        .spyOn(alchemyFacade, 'iterateOverNftsByAccount')
        .mockImplementation(async function* (): AsyncGenerator<AlchemyShrunkNft[]> {
          yield [
            { contractAddress: '0xABC', tokenId: '1' },
            { contractAddress: '0xABC', tokenId: '2' }
          ] as AlchemyShrunkNft[];
          yield [{ contractAddress: '0xDEF', tokenId: '3' }] as AlchemyShrunkNft[];
        });
      const fnGetByKeys = jest
        .spyOn(service, 'getByKeys')
        .mockImplementation(async keys =>
          keys.map(key => buildCollectionAsset({ contract: key.contract, tokenId: key.tokenId }))
        );

      const result = await service.getByWallet('0xwallet', { skip: 1, limit: 2, whitelisted: undefined });

      expect(result).toEqual([
        expect.objectContaining({ contract: '0xabc', tokenId: '2' }),
        expect.objectContaining({ contract: '0xdef', tokenId: '3' })
      ]);
      expect(fnGetByKeys).toHaveBeenCalledTimes(2);
    });

    it('skips batches fully when skip exceeds batch size', async () => {
      jest
        .spyOn(alchemyFacade, 'iterateOverNftsByAccount')
        .mockImplementation(async function* (): AsyncGenerator<AlchemyShrunkNft[]> {
          yield [
            { contractAddress: '0xAAA', tokenId: '1' },
            { contractAddress: '0xAAA', tokenId: '2' }
          ] as AlchemyShrunkNft[];
          yield [{ contractAddress: '0xBBB', tokenId: '3' }] as AlchemyShrunkNft[];
          yield [{ contractAddress: '0xCCC', tokenId: '4' }] as AlchemyShrunkNft[];
        });
      const fnGetByKeys = jest
        .spyOn(service, 'getByKeys')
        .mockImplementation(async keys =>
          keys.map(key => buildCollectionAsset({ contract: key.contract, tokenId: key.tokenId }))
        );

      const result = await service.getByWallet('0xwallet', { skip: 3, limit: 2, whitelisted: undefined });

      expect(result).toEqual([expect.objectContaining({ contract: '0xccc', tokenId: '4' })]);
      expect(fnGetByKeys).toHaveBeenCalledTimes(1);
      expect(fnGetByKeys).toHaveBeenCalledWith([{ contract: '0xccc', tokenId: '4' }], {
        whitelisted: undefined,
        skip: 0,
        limit: 2
      });
    });

    it('returns empty when limit is zero', async () => {
      jest
        .spyOn(alchemyFacade, 'iterateOverNftsByAccount')
        .mockImplementation(async function* (): AsyncGenerator<AlchemyShrunkNft[]> {
          yield [{ contractAddress: '0xAAA', tokenId: '1' }] as AlchemyShrunkNft[];
        });
      const fnGetByKeys = jest.spyOn(service, 'getByKeys');

      const result = await service.getByWallet('0xwallet', { skip: 0, limit: 0, whitelisted: undefined });

      expect(result).toEqual([]);
      expect(fnGetByKeys).not.toHaveBeenCalled();
    });

    it('skips empty slices without calling getByKeys', async () => {
      jest
        .spyOn(alchemyFacade, 'iterateOverNftsByAccount')
        .mockImplementation(async function* (): AsyncGenerator<AlchemyShrunkNft[]> {
          yield [] as AlchemyShrunkNft[];
        });
      const fnGetByKeys = jest.spyOn(service, 'getByKeys');

      const result = await service.getByWallet('0xwallet', { skip: 0, limit: 5, whitelisted: undefined });

      expect(result).toEqual([]);
      expect(fnGetByKeys).not.toHaveBeenCalled();
    });

    it('continues after empty slices and processes later batches', async () => {
      jest
        .spyOn(alchemyFacade, 'iterateOverNftsByAccount')
        .mockImplementation(async function* (): AsyncGenerator<AlchemyShrunkNft[]> {
          yield [] as AlchemyShrunkNft[];
          yield [{ contractAddress: '0xAAA', tokenId: '1' }] as AlchemyShrunkNft[];
        });
      const fnGetByKeys = jest
        .spyOn(service, 'getByKeys')
        .mockImplementation(async keys =>
          keys.map(key => buildCollectionAsset({ contract: key.contract, tokenId: key.tokenId }))
        );

      const result = await service.getByWallet('0xwallet', { skip: 0, limit: 5, whitelisted: undefined });

      expect(result).toEqual([expect.objectContaining({ contract: '0xaaa', tokenId: '1' })]);
      expect(fnGetByKeys).toHaveBeenCalledTimes(1);
    });

    it('continues when a batch produces an empty slice', async () => {
      const nftBatchWithEmptySlice = {
        length: 1,
        slice: jest.fn().mockReturnValue([])
      } as unknown as AlchemyShrunkNft[];
      jest
        .spyOn(alchemyFacade, 'iterateOverNftsByAccount')
        .mockImplementation(async function* (): AsyncGenerator<AlchemyShrunkNft[]> {
          yield nftBatchWithEmptySlice;
          yield [{ contractAddress: '0xAAA', tokenId: '2' }] as AlchemyShrunkNft[];
        });
      const fnGetByKeys = jest
        .spyOn(service, 'getByKeys')
        .mockImplementation(async keys =>
          keys.map(key => buildCollectionAsset({ contract: key.contract, tokenId: key.tokenId }))
        );

      const result = await service.getByWallet('0xwallet', { skip: 0, limit: 2, whitelisted: undefined });

      expect(result).toEqual([expect.objectContaining({ contract: '0xaaa', tokenId: '2' })]);
      expect(fnGetByKeys).toHaveBeenCalledTimes(1);
      expect(nftBatchWithEmptySlice.slice).toHaveBeenCalled();
    });
  });

  describe(AssetService.prototype.getMany.name, () => {
    it('delegates to getByKeys when keys provided', async () => {
      const keys = [{ contract: '0xabc', tokenId: '1' }];
      const fnGetByKeys = jest.spyOn(service, 'getByKeys').mockResolvedValue([]);

      const result = await service.getMany({ keys, page: 2, limit: 5, whitelisted: true });

      expect(result).toEqual([]);
      expect(fnGetByKeys).toHaveBeenCalledWith(keys, { skip: 5, limit: 5, whitelisted: true });
    });

    it('delegates to getByWallet when wallet provided', async () => {
      const fnGetByWallet = jest.spyOn(service, 'getByWallet').mockResolvedValue([buildCollectionAsset()]);

      const result = await service.getMany({ wallet: '0xabc', page: 1, limit: 10 });

      expect(result).toHaveLength(1);
      expect(fnGetByWallet).toHaveBeenCalledWith('0xabc', { skip: 0, limit: 10, whitelisted: undefined });
    });

    it('falls back to repository find when no keys or wallet', async () => {
      const fnFind = jest.spyOn(assetRepository, 'find').mockResolvedValue([buildCollectionAsset()]);

      const result = await service.getMany({ page: 1, limit: 2 });

      expect(result).toHaveLength(1);
      expect(fnFind).toHaveBeenCalledWith({}, { skip: 0, limit: 2, whitelisted: undefined });
    });
  });

  describe(AssetService.prototype.updateMetadata.name, () => {
    it('updates links for existing asset', async () => {
      const asset = buildCollectionAsset({
        imageSmallUrl: '',
        imageMediumUrl: ''
      });

      const fnUpdate = jest.spyOn(assetRepository, 'updateByIds').mockResolvedValue();

      await service.updateMetadata(asset, {
        name: 'Test Asset',
        imageSmallUrl: 'http://object.storage/small.jpeg',
        imageMediumUrl: 'http://object.storage/medium.jpeg'
      });

      expect(fnUpdate).toHaveBeenCalledWith([1], {
        name: 'Test Asset',
        imageSmallUrl: 'http://object.storage/small.jpeg',
        imageMediumUrl: 'http://object.storage/medium.jpeg'
      });
    });

    it('does not update if payload is copy of existing asset', async () => {
      const asset = buildCollectionAsset({
        id: 1,
        contract: '0x123',
        tokenId: '1',
        name: 'Test Asset',
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });

      const fnUpdate = jest.spyOn(assetRepository, 'updateByIds').mockResolvedValue(null);
      await service.updateMetadata(asset, {
        name: 'Test Asset',
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });

      expect(fnUpdate).not.toHaveBeenCalled();
    });
  });

  describe(AssetService.prototype.validateAndRefreshLinks.name, () => {
    it('validates and refreshes links if url missing', async () => {
      const asset = buildCollectionAsset({
        imageSmallUrl: '',
        imageMediumUrl: ''
      });

      const fnUpdate = jest.spyOn(assetRepository, 'updateByIds').mockResolvedValue(null);
      jest.spyOn(metadataService, 'isLinkValid').mockResolvedValue(false);
      jest.spyOn(assetRepository, 'iterateOverNonEmptyImageEntries').mockImplementation(async function* () {
        yield asset;
      });
      jest.spyOn(metadataService, 'getImageUrls').mockResolvedValue({
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });

      const promise = service.validateAndRefreshLinks();
      await jest.advanceTimersByTimeAsync(100);
      await promise;

      expect(fnUpdate).toHaveBeenCalledWith([1], {
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });
    });

    it('validates and refreshes links if url is not valid', async () => {
      const asset = buildCollectionAsset({
        imageSmallUrl: 'http:\\example.com/invalid-url',
        imageMediumUrl: 'http://example.com/invalid-url'
      });

      const fnUpdate = jest.spyOn(assetRepository, 'updateByIds').mockResolvedValue(null);
      jest.spyOn(metadataService, 'isLinkValid').mockResolvedValue(false);
      jest.spyOn(assetRepository, 'iterateOverNonEmptyImageEntries').mockImplementation(async function* () {
        yield asset;
      });
      jest.spyOn(metadataService, 'getImageUrls').mockResolvedValue({
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });

      const promise = service.validateAndRefreshLinks();
      await jest.advanceTimersByTimeAsync(100);
      await promise;

      expect(fnUpdate).toHaveBeenCalledWith([1], {
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });
    });

    it('validates but does not refresh links if valid', async () => {
      const asset = buildCollectionAsset({
        imageSmallUrl: 'http://example.com/valid-small.jpg',
        imageMediumUrl: 'http://example.com/valid-medium.jpg'
      });

      const fnUpdate = jest.spyOn(assetRepository, 'updateByIds').mockResolvedValue(null);
      jest.spyOn(metadataService, 'isLinkValid').mockResolvedValue(true);
      jest.spyOn(assetRepository, 'iterateOverNonEmptyImageEntries').mockImplementation(async function* () {
        yield asset;
      });

      const promise = service.validateAndRefreshLinks();
      await jest.advanceTimersByTimeAsync(100);
      await promise;

      expect(fnUpdate).not.toHaveBeenCalled();
    });
  });

  describe(AssetService.prototype.updateMissingImageUrls.name, () => {
    it('updates empty links for existing asset', async () => {
      const asset = buildCollectionAsset({
        imageSmallUrl: '',
        imageMediumUrl: ''
      });

      const fnUpdate = jest.spyOn(assetRepository, 'updateByIds').mockResolvedValue(null);
      jest.spyOn(assetRepository, 'iterateOverEmptyImageEntries').mockImplementation(async function* () {
        yield asset;
      });
      jest.spyOn(metadataService, 'resolveMissingImageUrls').mockResolvedValue({
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });

      await service.updateMissingImageUrls();

      expect(fnUpdate).toHaveBeenCalledWith([1], {
        imageMediumUrl: 'http://example.com/medium.jpg',
        imageSmallUrl: 'http://example.com/small.jpg'
      });
    });
  });

  describe(AssetService.prototype.toDtos.name, () => {
    it('returns empty array for empty assets input', async () => {
      const fnGetCollections = jest.spyOn(assetsFacade, 'getCollections');

      const dtos = await service.toDtos([], { projection: [] });

      expect(dtos).toEqual([]);
      expect(fnGetCollections).not.toHaveBeenCalled();
    });

    it('maps owners and collections with projections', async () => {
      const assetA = buildCollectionAsset({ contract: '0xabc', tokenId: '1', collection: { id: 1 } as Collection });
      const assetB = buildCollectionAsset({ contract: '0xdef', tokenId: '2', collection: { id: 2 } as Collection });
      jest.spyOn(metadataService, 'getOwners').mockResolvedValue(['0xowner']);
      jest
        .spyOn(assetsFacade, 'getCollections')
        .mockResolvedValue([
          buildCollectionDto({ contract: '0xabc', tokenRange: '1:5', id: 1 }),
          buildCollectionDto({ contract: '0xdef', tokenRange: '2:2', id: 2 })
        ]);

      const dtos = await service.toDtos([assetA, assetB], {
        projection: [AssetProjection.CollectionStats, AssetProjection.CollectionFloorPrice]
      });

      expect(assetsFacade.getCollections).toHaveBeenCalledWith({
        keys: [
          { contract: '0xabc', tokenId: '1' },
          { contract: '0xdef', tokenId: '2' }
        ],
        projection: [CollectionProjection.Stats, CollectionProjection.FloorPrice]
      });
      expect(dtos[0].collection?.id).toBe(1);
      expect(dtos[1].collection?.id).toBe(2);
      expect(dtos[0].owners).toEqual(['0xowner']);
      expect(dtos[1].owners).toEqual(['0xowner']);
    });
  });

  describe(AssetService.prototype.toDto.name, () => {
    it('delegates to toDtos with empty projection and returns first dto', async () => {
      const asset = buildCollectionAsset({ contract: '0xabc', tokenId: '1' });
      const dto = buildAssetDto({ contract: '0xabc', tokenId: '1' });
      const fnToDtos = jest.spyOn(service, 'toDtos').mockResolvedValue([dto]);

      const result = await service.toDto(asset);

      expect(result).toBe(dto);
      expect(fnToDtos).toHaveBeenCalledWith([asset], { projection: [] });
    });

    it('returns undefined when toDtos returns an empty array', async () => {
      const asset = buildCollectionAsset({ contract: '0xabc', tokenId: '1' });
      jest.spyOn(service, 'toDtos').mockResolvedValue([]);

      const result = await service.toDto(asset);

      expect(result).toBeUndefined();
    });

    it('returns owners as empty array for punks without calling metadataService.getOwners', async () => {
      const asset = buildCollectionAsset({
        contract: '0xabc',
        tokenId: '1',
        collection: { id: 1, tokenStandard: TokenStandard.Punks } as unknown as Collection
      });

      const fnGetOwners = jest.spyOn(metadataService, 'getOwners');
      jest
        .spyOn(assetsFacade, 'getCollections')
        .mockResolvedValue([buildCollectionDto({ contract: '0xabc', tokenRange: '1:10', id: 1 })]);

      const dto = await service.toDto(asset);

      expect(dto.owners).toEqual([]);
      expect(dto.collection?.id).toBe(1);
      expect(fnGetOwners).not.toHaveBeenCalled();
    });
  });
});
