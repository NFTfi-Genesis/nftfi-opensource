import { Provider } from '@ethersproject/providers';
import { Contract } from '@nftfi.api/modules/ethers-observer';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import ABI from './asset-erc1155.abi.json';
import { AbstractAssetContract } from './asset.types';

export class AssetERC1155 extends Contract implements AbstractAssetContract {
  readonly tokenStandard = TokenStandard.ERC1155;

  constructor(address: string, provider: Provider) {
    super(address, ABI, provider);
  }

  async isOwner(tokenId: string, address: string): Promise<boolean> {
    const balance = await this.call<{ null: number }>('balanceOf', address, tokenId.toString());
    return balance.null > 0;
  }

  async getOwner(_tokenId: string): Promise<string> {
    // TODO implement getOwner for ERC1155
    return '0x000000000000000000000000000000000000000000';
  }

  async supportsInterface(): Promise<boolean> {
    const supports = await this.call<{ null: boolean }>('supportsInterface', '0xd9b67a26').catch(() => ({
      null: false
    }));
    if (supports.null) return true;

    const hasFnBalanceOf = await this.hasFunction('balanceOf', 1);
    return hasFnBalanceOf;
  }
}
