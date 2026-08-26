import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Injectable, Inject, DynamicModule } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { InjectEthersProvider } from 'nestjs-ethers';
import { AssetERC721 } from './asset-erc721.contract';
import { AssetERC1155 } from './asset-erc1155.contract';
import { AssetPunk } from './asset-punk.contract';

const OWNER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export type AssetContractType = AssetERC721 | AssetERC1155 | AssetPunk;

@Injectable()
export class AssetContract {
  private readonly assetInstances: Record<string, AssetContractType> = {};

  constructor(
    @InjectEthersProvider() private readonly ethersProvider: StaticJsonRpcProvider,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache<RedisStore>
  ) {}

  static forRoot(): DynamicModule {
    return {
      module: AssetContract,
      global: true,
      providers: [AssetContract],
      exports: [AssetContract]
    };
  }

  async getContractInstance(contractAddress: string): Promise<AssetContractType> {
    if (this.assetInstances[contractAddress]) {
      return this.assetInstances[contractAddress];
    }

    const erc721Contract = new AssetERC721(contractAddress, this.ethersProvider);
    if (await erc721Contract.supportsInterface()) {
      this.assetInstances[contractAddress] = erc721Contract;
      return erc721Contract;
    }

    const erc1155Contract = new AssetERC1155(contractAddress, this.ethersProvider);
    if (await erc1155Contract.supportsInterface()) {
      this.assetInstances[contractAddress] = erc1155Contract;
      return erc1155Contract;
    }

    const punkContract = new AssetPunk(contractAddress, this.ethersProvider);
    if (await punkContract.supportsInterface()) {
      this.assetInstances[contractAddress] = punkContract;
      return punkContract;
    }

    throw new Error(`Unsupported contract type for address: ${contractAddress}`);
  }

  async isOwnerOf(contractAddress: string, tokenId: string, accountAddress?: string): Promise<boolean> {
    const cacheKey = `asset:owner:${contractAddress}:${tokenId}${accountAddress}`;
    const cachedIsOwner = await this.cacheManager.get<boolean>(cacheKey);

    if (cachedIsOwner) {
      return cachedIsOwner;
    }

    const contract = await this.getContractInstance(contractAddress);
    const isOwner = await contract.isOwner(tokenId, accountAddress);
    await this.cacheManager.set(cacheKey, isOwner, OWNER_CACHE_TTL);

    return isOwner;
  }
}
