import { Provider } from '@ethersproject/providers';
import { Contract } from '@nftfi.api/modules/ethers-observer';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import ABI from './asset-punk.abi.json';
import { AbstractAssetContract } from './asset.types';

export class AssetPunk extends Contract implements AbstractAssetContract {
  readonly tokenStandard = TokenStandard.Punks;

  constructor(address: string, provider: Provider) {
    super(address, ABI, provider);
  }

  async isOwner(tokenId: string, address: string): Promise<boolean> {
    const owner = await this.getOwner(tokenId);
    return owner.toLowerCase() === address.toLowerCase();
  }

  async getOwner(tokenId: string): Promise<string> {
    const owner = await this.call<{ null: string }>('punkIndexToAddress', tokenId.toString());
    return owner.null.toLowerCase();
  }

  async supportsInterface(): Promise<boolean> {
    const hasFnPunkIndexToAddress = await this.hasFunction('punkIndexToAddress', 1);
    return hasFnPunkIndexToAddress;
  }
}
