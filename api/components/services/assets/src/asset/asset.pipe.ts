import { BadRequestException, Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { CollectionAsset } from '@nftfi.api/repositories/postgres/collection-asset';
import { GetAssetParamsDto } from '@nftfi.api/facades/assets';
import { AssetService } from './asset.service';

@Injectable()
export class AssetPipe implements PipeTransform {
  constructor(private readonly service: AssetService) {}

  async transform(params: GetAssetParamsDto): Promise<CollectionAsset> {
    if (!params.contract || !params.tokenId) {
      throw new BadRequestException('Contract and tokenId are required');
    }
    const asset = await this.service.getByKey(params.contract, params.tokenId);
    if (!asset) {
      throw new NotFoundException(`Asset not found for key ${params.contract}#${params.tokenId}`);
    }

    return asset;
  }
}
