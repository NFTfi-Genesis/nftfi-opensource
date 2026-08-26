import { Provider } from '@ethersproject/providers';
import { Contract } from '@nftfi.api/modules/ethers-observer';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import ABI from './asset-erc721.abi.json';
import { AbstractAssetContract } from './asset.types';

export class AssetERC721 extends Contract implements AbstractAssetContract {
  readonly tokenStandard: TokenStandard = TokenStandard.ERC721;

  constructor(address: string, provider: Provider) {
    super(address, ABI, provider);
  }

  async isOwner(tokenId: string, address: string): Promise<boolean> {
    const owner = await this.getOwner(tokenId);
    return owner === address.toLowerCase();
  }

  async getOwner(tokenId: string): Promise<string> {
    const owner = await this.call<{ null: string }>('ownerOf', tokenId.toString());
    return owner.null.toLowerCase();
  }

  async supportsInterface(): Promise<boolean> {
    const supports = await this.call<{ null: boolean }>('supportsInterface', '0x80ac58cd').catch(() => ({
      null: false
    }));
    if (supports.null) return true;

    const hasFnOwnerOf = await this.hasFunction('ownerOf', 1);
    return hasFnOwnerOf;
  }
}
