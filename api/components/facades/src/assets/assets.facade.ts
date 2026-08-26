import { first } from 'lodash';
import { ClientRMQ } from '@nestjs/microservices';
import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import {
  type QueueFacadeConfig,
  ForRootOptions,
  ConfigCallback,
  QueueFacade,
  QueueFacadeConfigToken,
  RPCResponse
} from '../queue';
import {
  AssetDto,
  AssetKeyDto,
  CollectionDto,
  GetAssetParamsDto,
  GetAssetsByKeysDto,
  GetCollectionsByKeysDto,
  GetCollectionsParamsDto
} from './dtos';
import { AssetsQueueTopic } from './assets.types';

const ServiceToken = `AssetsFacadeToken`;
const QueueChannel = 'assets';

@Injectable()
export class AssetsFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async getAssetByKey(contract: string, tokenId: string): Promise<AssetDto> {
    const { data } = await this.send<GetAssetParamsDto, RPCResponse<AssetDto>>(AssetsQueueTopic.GetAssetByKey, {
      contract,
      tokenId
    });
    return data;
  }

  async getAssets(params: GetAssetsByKeysDto): Promise<AssetDto[]> {
    const { data } = await this.send<GetAssetsByKeysDto, RPCResponse<AssetDto[]>>(AssetsQueueTopic.GetAssets, params);
    return data;
  }

  async createAsset(contract: string, tokenId: string): Promise<void> {
    await this.emit<GetAssetParamsDto>(AssetsQueueTopic.CreateAsset, { contract, tokenId });
  }

  async getCollectionsByContract(contract: string): Promise<CollectionDto[]> {
    const { data } = await this.send<GetCollectionsParamsDto, RPCResponse<CollectionDto[]>>(
      AssetsQueueTopic.GetCollectionsByContract,
      {
        contract
      }
    );

    return data;
  }

  async getCollectionByKey(contract: string, tokenId: string): Promise<CollectionDto> {
    const { data } = await this.send<AssetKeyDto, RPCResponse<CollectionDto>>(AssetsQueueTopic.GetCollectionByKey, {
      contract,
      tokenId
    });

    return data;
  }

  async getCollections(params: GetCollectionsByKeysDto): Promise<CollectionDto[]> {
    const { data } = await this.send<GetCollectionsByKeysDto, RPCResponse<CollectionDto[]>>(
      AssetsQueueTopic.GetCollections,
      params
    );

    return data;
  }

  static getClosestCollectionToTokenId(collections: CollectionDto[], contract: string, tokenId: string): CollectionDto {
    const lccontract = contract.toLowerCase();
    const filteredCollections = collections.filter(c => c.contract.toLowerCase() === lccontract);
    if (filteredCollections.length <= 1) return first(filteredCollections);

    let closest: { collection: CollectionDto; distance: bigint } = null;

    const bnTokenId = BigInt(tokenId);

    for (const collection of filteredCollections) {
      const [start, end] = collection.tokenRange.split(':');
      const bnStart = BigInt(start);
      const bnEnd = end ? BigInt(end) : bnStart;

      if (bnTokenId >= bnStart && bnTokenId <= bnEnd) {
        return collection;
      }

      const distance = BigInt(bnTokenId < bnStart ? bnStart - bnTokenId : bnTokenId > bnEnd ? bnTokenId - bnEnd : 0);

      if (!closest || distance < closest.distance) {
        closest = { collection, distance };
      }
    }

    return closest?.collection;
  }

  static getTokenSupply([begin, end]: [string, string]): string {
    if (!begin && !end) {
      throw new Error(`Invalid collection range format: "[${begin}, ${end}]"`);
    }

    const bnBegin = BigInt(begin);
    const bnEnd = end ? BigInt(end) : bnBegin;

    return (bnEnd - bnBegin + BigInt(1)).toString();
  }

  static isInRange([begin, end]: [string, string], tokenId: string): boolean {
    if (!begin && !end) {
      throw new Error(`Invalid collection range format: "[${begin}, ${end}]"`);
    }

    const assetId = BigInt(tokenId);

    const bnBegin = BigInt(begin);
    if (begin && !end) {
      return assetId >= bnBegin;
    }

    const bnEnd = BigInt(end);
    return assetId >= bnBegin && assetId <= bnEnd;
  }

  static extendRange([begin, end]: [string, string], tokenId: string): [string, string] {
    if (!begin && !end) {
      throw new Error(`Invalid collection range format: "[${begin}, ${end}]"`);
    }

    const assetId = BigInt(tokenId);
    const bnBegin = BigInt(begin);
    const bnEnd = end ? BigInt(end) : assetId;

    return assetId <= bnBegin ? [assetId.toString(), bnEnd.toString()] : [bnBegin.toString(), assetId.toString()];
  }

  static override forRoot(options: ForRootOptions): DynamicModule {
    return super.forRoot({
      caller: options.caller,
      timeout: options.timeout,
      queue: QueueChannel,
      token: ServiceToken,
      configCallback: options.configCallback
    });
  }

  static override setupMicroservice(app: INestApplication, configCallback: ConfigCallback): void {
    return super.setupMicroservice(app, configCallback, QueueChannel, {});
  }
}
