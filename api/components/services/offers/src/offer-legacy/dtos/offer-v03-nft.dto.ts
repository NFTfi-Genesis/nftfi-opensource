import { ApiProperty, PickType } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { IsGreaterThan } from '@nftfi.api/validation';

const CollectionId = applyDecorators(
  Expose(),
  Type(() => Number),
  IsInt(),
  Min(0),
  ApiProperty({ type: Number })
);

class OfferV03NftProjectDto {
  @Expose()
  @ApiProperty({ type: String })
  name: string;
}

export class OfferV03NftCollectionRangeDto {
  @CollectionId
  from: number;

  @CollectionId
  @IsGreaterThan('from')
  to: number;
}

export class OfferV03NftDto {
  @Expose()
  @ApiProperty({ type: String })
  id: string;

  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  address: string;

  @Expose()
  @Type(() => OfferV03NftCollectionRangeDto)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiProperty({ type: OfferV03NftCollectionRangeDto, required: false })
  ids?: OfferV03NftCollectionRangeDto;

  @Expose()
  @ApiProperty({ type: String, required: false })
  name?: string;

  @Expose()
  @ApiProperty({ type: String })
  imageUrl: string;

  @Expose()
  @Type(() => OfferV03NftProjectDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV03NftProjectDto })
  project: OfferV03NftProjectDto;
}

export class DraftOfferV03NftAssetDto extends PickType(OfferV03NftDto, ['id', 'address']) {}
export class DraftOfferV03NftCollectionDto extends PickType(OfferV03NftDto, ['id', 'ids', 'address']) {}
