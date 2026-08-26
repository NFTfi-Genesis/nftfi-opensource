import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientRMQ } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueFacade, QueueFacadeConfigToken } from '@nftfi.api/facades/queue';
import { AssetsFacade, CollectionDto, CollectionProjection } from '../src/assets';

const buildCollectionDto = (overrides: Partial<CollectionDto> = {}): CollectionDto => ({
  id: 1,
  contract: '0x1234567890abcdef1234567890abcdef12345678',
  name: 'Test Collection',
  ranking: 1,
  imageUrl: 'https://example.com/image.png',
  tokenRange: '1000:1999',
  tokenSupply: '1000',
  tokenStandard: 'ERC721' as CollectionDto['tokenStandard'],
  whitelisted: true,
  stats: null,
  floor: null,
  ...overrides
});

describe(AssetsFacade.name, () => {
  let facade: AssetsFacade;
  let client: ClientRMQ;
  let configService: ConfigService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              rabbitmq: {
                url: 'amqp://localtest:5672'
              }
            })
          ]
        })
      ],
      providers: [
        AssetsFacade,
        {
          provide: 'AssetsFacadeToken',
          useValue: {
            emit: jest.fn(),
            send: jest.fn()
          }
        },
        {
          provide: QueueFacadeConfigToken,
          useValue: {
            urls: ['amqp://localtest:5672'],
            caller: 'test-caller'
          }
        }
      ]
    }).compile();

    facade = moduleRef.get(AssetsFacade);
    client = moduleRef.get('AssetsFacadeToken');
    configService = moduleRef.get(ConfigService);
  });

  describe(AssetsFacade.forRoot.name, () => {
    it('should return a dynamic module with correct configuration', () => {
      const dynamicModule = AssetsFacade.forRoot({
        configCallback: () => ({ urls: ['amqp://localtest:5672'] }),
        caller: 'test-caller'
      });
      expect(dynamicModule.module.name).toBe('AssetsFacadeModule');
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe(AssetsFacade.setupMicroservice.name, () => {
    it('should setup microservice with correct configuration', () => {
      const app = {
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;
      const fnSetup = jest.spyOn(QueueFacade, 'setupMicroservice').mockReturnValueOnce();

      AssetsFacade.setupMicroservice(app, () => ({ urls: ['amqp://localtest:5672'] }));

      expect(fnSetup.mock.calls[0][1](configService)).toEqual({ urls: ['amqp://localtest:5672'] });
      expect(fnSetup).toHaveBeenCalledWith(app, expect.any(Function), 'assets', {});
    });
  });

  describe(AssetsFacade.prototype.getAssetByKey.name, () => {
    it('should handle loan sync', async () => {
      const fnEmit = jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: {} }));

      const result = await facade.getAssetByKey('0x123', '1');

      expect(result).toEqual({});
      expect(fnEmit).toHaveBeenCalledWith('assets_get-by-key', {
        contract: '0x123',
        tokenId: '1',
        caller: 'test-caller'
      });
    });
  });

  describe(AssetsFacade.prototype.createAsset.name, () => {
    it('should createAsset an asset message', async () => {
      const fnEmit = jest.spyOn(client, 'emit').mockReturnValueOnce(of({}));

      await facade.createAsset('0x123', '1');

      expect(fnEmit).toHaveBeenCalledWith('assets_create', { contract: '0x123', tokenId: '1', caller: 'test-caller' });
    });
  });

  describe(AssetsFacade.getClosestCollectionToTokenId.name, () => {
    it('finds the closest collection from lower bound when multiple collections exist', () => {
      const collections = [
        buildCollectionDto({ id: 1, contract: '0x123', tokenRange: '1:9' }),
        buildCollectionDto({ id: 2, contract: '0x123', tokenRange: '11:99' }),
        buildCollectionDto({ id: 3, contract: '0x123', tokenRange: '199' })
      ];

      const result = AssetsFacade.getClosestCollectionToTokenId(collections, '0x123', '7');

      expect(result).toEqual(expect.objectContaining({ id: 1, tokenRange: '1:9' }));
    });

    it('finds the closest collection from upper bound when multiple collections exist', () => {
      const collections = [
        buildCollectionDto({ id: 1, contract: '0x123', tokenRange: '1:9' }),
        buildCollectionDto({ id: 2, contract: '0x123', tokenRange: '11:99' }),
        buildCollectionDto({ id: 3, contract: '0x123', tokenRange: '199' })
      ];

      const result = AssetsFacade.getClosestCollectionToTokenId(collections, '0x123', '1000');

      expect(result).toEqual(expect.objectContaining({ id: 3, tokenRange: '199' }));
    });

    it('finds the closest collection from lower bound when tokenId is below all ranges', () => {
      const collections = [
        buildCollectionDto({ id: 1, contract: '0x123', tokenRange: '10:20' }),
        buildCollectionDto({ id: 2, contract: '0x123', tokenRange: '30:40' }),
        buildCollectionDto({ id: 3, contract: '0x123', tokenRange: '50:60' })
      ];

      const result = AssetsFacade.getClosestCollectionToTokenId(collections, '0x123', '1');

      expect(result).toEqual(expect.objectContaining({ id: 1, tokenRange: '10:20' }));
    });

    it('returns matching collection immediately when tokenId is inside a range', () => {
      const collections = [
        buildCollectionDto({ id: 1, contract: '0x123', tokenRange: '1:9' }),
        buildCollectionDto({ id: 2, contract: '0x123', tokenRange: '10:99' })
      ];

      const result = AssetsFacade.getClosestCollectionToTokenId(collections, '0x123', '15');

      expect(result).toEqual(expect.objectContaining({ id: 2, tokenRange: '10:99' }));
    });

    it('returns the only available collection when there is just one option', () => {
      const onlyCollection = buildCollectionDto({ id: 1, contract: '0x123', tokenRange: '1:9' });

      const result = AssetsFacade.getClosestCollectionToTokenId([onlyCollection], '0x123', '5');

      expect(result).toEqual(onlyCollection);
    });
  });

  describe(AssetsFacade.prototype.getCollectionByKey.name, () => {
    it('should return a collection for a given contract and tokenId', async () => {
      const fnSend = jest.spyOn(client, 'send').mockReturnValueOnce(
        of({
          data: buildCollectionDto({
            contract: '0x123',
            tokenRange: '1:2'
          })
        })
      );

      const result = await facade.getCollectionByKey('0x123', '1');

      expect(result).toEqual({
        id: 1,
        contract: '0x123',
        imageUrl: 'https://example.com/image.png',
        name: 'Test Collection',
        ranking: 1,
        tokenRange: '1:2',
        tokenStandard: 'ERC721',
        tokenSupply: '1000',
        whitelisted: true,
        floor: null,
        stats: null
      });
      expect(fnSend).toHaveBeenCalledWith('collections_get-by-key', {
        contract: '0x123',
        tokenId: '1',
        caller: 'test-caller'
      });
    });
  });

  describe(AssetsFacade.prototype.getCollectionsByContract.name, () => {
    it('returns collections for contract', async () => {
      const collections = [buildCollectionDto({ id: 1, contract: '0xaaa' })];
      const fnSend = jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: collections }));

      const result = await facade.getCollectionsByContract('0xaaa');

      expect(result).toEqual(collections);
      expect(fnSend).toHaveBeenCalledWith('collections_get-by-contract', {
        contract: '0xaaa',
        caller: 'test-caller'
      });
    });
  });

  describe(AssetsFacade.prototype.getAssets.name, () => {
    it('returns assets for provided keys', async () => {
      const assets = [
        { contract: '0xabc', tokenId: '1' },
        { contract: '0xabc', tokenId: '2' }
      ];
      const fnSend = jest.spyOn(client, 'send').mockReturnValueOnce(of({ data: assets }));

      const result = await facade.getAssets({ keys: assets as never });

      expect(result).toEqual(assets);
      expect(fnSend).toHaveBeenCalledWith('assets_get', {
        keys: assets,
        caller: 'test-caller'
      });
    });
  });

  describe(AssetsFacade.prototype.getCollections.name, () => {
    it('returns multiple collections with projection', async () => {
      const fnSend = jest.spyOn(client, 'send').mockReturnValueOnce(
        of({
          data: [buildCollectionDto({ id: 1, contract: '0xabc' }), buildCollectionDto({ id: 2, contract: '0xdef' })]
        })
      );

      const result = await facade.getCollections({
        keys: [
          { contract: '0xabc', tokenId: '1' },
          { contract: '0xdef', tokenId: '2' }
        ],
        projection: [CollectionProjection.FloorPrice]
      });

      expect(result).toEqual([
        expect.objectContaining({ id: 1, contract: '0xabc' }),
        expect.objectContaining({ id: 2, contract: '0xdef' })
      ]);
      expect(fnSend).toHaveBeenCalledWith('collections_get', {
        keys: [
          { contract: '0xabc', tokenId: '1' },
          { contract: '0xdef', tokenId: '2' }
        ],
        projection: [CollectionProjection.FloorPrice],
        caller: 'test-caller'
      });
    });
  });

  describe(AssetsFacade.isInRange.name, () => {
    it('returns true for exact match', () => {
      expect(AssetsFacade.isInRange(['100', '200'], '150')).toBe(true);
    });

    it('returns true even if only lower border exists', () => {
      expect(AssetsFacade.isInRange(['100', ''], '100')).toBe(true);
    });

    it('returns false for out of range', () => {
      expect(AssetsFacade.isInRange(['100', '200'], '250')).toBe(false);
    });

    it('throws error for invalid token', () => {
      expect(() => AssetsFacade.isInRange(['100', '200'], 'invalid')).toThrow('Cannot convert invalid to a BigInt');
    });

    it('throws error for empty range', () => {
      expect(() => AssetsFacade.isInRange(['', ''], '100')).toThrow('Invalid collection range format: "[, ]"');
    });
  });

  describe(AssetsFacade.extendRange.name, () => {
    it('extends range to include token', () => {
      const range = AssetsFacade.extendRange(['100', '200'], '350');
      expect(range).toEqual(['100', '350']);
    });

    it('extends range to include token at lower end', () => {
      const range = AssetsFacade.extendRange(['100', '200'], '50');
      expect(range).toEqual(['50', '200']);
    });

    it('extends range to include token at upper end', () => {
      const range = AssetsFacade.extendRange(['100', ''], '300');
      expect(range).toEqual(['100', '300']);
    });

    it("doesn't extend range if token on upper end is included", () => {
      const range = AssetsFacade.extendRange(['100', '200'], '200');
      expect(range).toEqual(['100', '200']);
    });

    it('throws error for empty range', () => {
      expect(() => AssetsFacade.extendRange(['', ''], '100')).toThrow('Invalid collection range format: "[, ]"');
    });
  });

  describe(AssetsFacade.getTokenSupply.name, () => {
    it('returns token supply for ranged collection', () => {
      const supply = AssetsFacade.getTokenSupply(['100', '199']);
      expect(supply).toEqual('100');
    });

    it('returns token supply for single token collection', () => {
      const supply = AssetsFacade.getTokenSupply(['100', '']);
      expect(supply).toEqual('1');
    });

    it('throws when token id is invalid', () => {
      expect(() => AssetsFacade.getTokenSupply(['invalid', ''])).toThrow('Cannot convert invalid to a BigInt');
    });

    it('throws for empty range', () => {
      expect(() => AssetsFacade.getTokenSupply(['', ''])).toThrow('Invalid collection range format: "[, ]"');
    });
  });
});
