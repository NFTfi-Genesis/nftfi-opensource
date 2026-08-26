import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsEthereumAddress, IsNumberString } from 'class-validator';
import { transformers } from '@nftfi.api/validation';
import { CollectionDto } from './collection.dto';

export class AssetDto {
  @Expose()
  @ApiProperty({ type: Number })
  id: number;

  @Expose()
  @ApiProperty()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  contract: string;

  @Expose()
  @ApiProperty()
  @IsNumberString()
  tokenId: string;

  @Expose()
  @ApiProperty({ type: String, isArray: true })
  owners: string[];

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  imageSmallUrl: string;

  @Expose()
  @ApiProperty()
  imageMediumUrl: string;

  @Expose()
  @Type(() => CollectionDto)
  @ApiProperty({ type: CollectionDto })
  collection: CollectionDto;
}

export class GetAssetParamsDto extends PickType(AssetDto, ['contract', 'tokenId']) {}
