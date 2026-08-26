import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { CollectionFloorPriceDto } from './collection-floor-price.dto';
import { CollectionStatsDto } from './collection-stats.dto';

export class CollectionDto {
  @Expose()
  @ApiProperty({ type: Number })
  id: number;

  @Expose()
  @ApiProperty({ description: 'Eth contract address' })
  contract: string;

  @Expose()
  @ApiProperty({ description: '0:10000' })
  tokenRange: string;

  @Expose()
  @ApiProperty()
  tokenSupply: string;

  @Expose()
  @ApiProperty({ enum: TokenStandard })
  tokenStandard: TokenStandard;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  ranking: number;

  @Expose()
  @ApiProperty()
  imageUrl: string;

  @Expose()
  @ApiProperty()
  whitelisted: boolean;

  @Expose()
  @ApiProperty()
  openseaSlug?: string;

  @Expose()
  @ApiProperty({ type: CollectionFloorPriceDto, required: false })
  @Type(() => CollectionFloorPriceDto)
  floor: CollectionFloorPriceDto | null;

  @Expose()
  @ApiProperty({ type: CollectionStatsDto, required: false })
  @Type(() => CollectionStatsDto)
  stats: CollectionStatsDto | null;
}

export class GetCollectionsParamsDto extends PickType(CollectionDto, ['contract']) {}
