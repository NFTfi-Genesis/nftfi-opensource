import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { AssetERC721 } from './asset-erc721.contract';
import { AssetERC1155 } from './asset-erc1155.contract';
import { AssetPunk } from './asset-punk.contract';

export type AssetContractType = AssetERC721 | AssetERC1155 | AssetPunk;

export interface AbstractAssetContract {
  readonly tokenStandard: TokenStandard;

  isOwner(tokenId: string, address: string): Promise<boolean>;
  getOwner(tokenId: string): Promise<string>;
  supportsInterface(): Promise<boolean>;
}
