import { ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsEthereumAddress, IsOptional } from 'class-validator';
import { PaginationDto, transformers } from '@nftfi.api/validation';
import { AssetProjection } from '../assets.types';
import { AssetKeyDto, AssetKeysDto, TransformAssetKeys } from './asset-keys.dto';

export class GetAssetArrayQueryDto extends IntersectionType(PaginationDto, PartialType(AssetKeysDto)) {
  @TransformAssetKeys
  @IsOptional()
  keys?: AssetKeyDto[];

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false, description: 'Wallet address to query assets by ownership' })
  wallet?: string;

  @Expose()
  @Transform(transformers.toBoolean)
  @IsOptional()
  @ApiProperty({
    type: Boolean,
    required: false,
    description: 'Filter assets by whether their collection is whitelisted'
  })
  whitelisted?: boolean;

  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @IsEnum(AssetProjection, { each: true })
  @IsOptional()
  @ApiProperty({
    type: String,
    isArray: true,
    enum: AssetProjection,
    description: 'Projections to include in the response',
    example: [AssetProjection.CollectionStats],
    required: false
  })
  projection?: AssetProjection[];
}
export class GetAssetsByKeysDto extends IntersectionType(
  AssetKeysDto,
  PickType(GetAssetArrayQueryDto, ['projection'] as const)
) {}
