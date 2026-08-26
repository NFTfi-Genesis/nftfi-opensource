import { Inject, Injectable } from '@nestjs/common';
import axios, { Axios } from 'axios';
import { Cache } from '@nftfi.api/core';
import { AssetDto, AssetsFacade } from '@nftfi.api/facades/assets';
import { CollectionAssetRepository } from '@nftfi.api/repositories/postgres/collection-asset';
import { AssetMockConfigToken, type AssetModuleOptions } from './asset.types';

const ONE_DAY_MS_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

@Injectable()
export class AssetsMockFacade implements Pick<AssetsFacade, 'getAssetByKey'> {
  private readonly assetsClient: Axios;

  constructor(
    private readonly assetRepository: CollectionAssetRepository,
    @Inject(AssetMockConfigToken) private readonly config: AssetModuleOptions
  ) {
    this.assetsClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 60000
    });
  }

  @Cache(
    (_i, contract: string, tokenId: string) => `market-loans-restorer:assets:${contract}-${tokenId}`,
    ONE_DAY_MS_TTL
  )
  async getAssetByKey(contract: string, tokenId: string): Promise<AssetDto> {
    const dbEntry = await this.assetRepository.findByKey(contract, tokenId);
    if (dbEntry) {
      return {
        id: dbEntry.id,
        contract,
        tokenId,
        collection: null,
        owners: [],
        name: dbEntry.name,
        imageSmallUrl: dbEntry.imageSmallUrl,
        imageMediumUrl: dbEntry.imageMediumUrl
      };
    }

    const { data: apiData } = await this.assetsClient.get<AssetDto>(`/v1/assets/${contract}/${tokenId}`);
    if (apiData) {
      return apiData;
    }

    throw new Error(`Asset not found for contract ${contract} and tokenId ${tokenId}`);
  }
}
