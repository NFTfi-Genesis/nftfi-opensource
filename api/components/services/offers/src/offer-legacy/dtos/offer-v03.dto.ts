import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Type as ClassType } from '@nestjs/common';
import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { getResponsePaginatedBodyDto, getResponseBodyDto } from '@nftfi.api/core/dtos';
import { OfferType } from '../offer.types';
import { DraftOfferTypeTermsDto } from './offer-terms.dto';
import { OfferDto } from './offer.dto';
import { DraftOfferV03NftAssetDto, DraftOfferV03NftCollectionDto, OfferV03NftDto } from './offer-v03-nft.dto';
import { OfferV03FlagsDto } from './offer-v03-flags.dto';

const detectDraftOfferNftType = (object: DraftOfferV03Dto): ClassType => {
  switch (object.type) {
    case OfferType.Asset:
      return DraftOfferV03NftAssetDto;
    case OfferType.Collection:
      return DraftOfferV03NftCollectionDto;
    default:
      return DraftOfferV03NftAssetDto;
  }
};

export class OfferV03Dto extends OmitType(OfferDto, ['nft']) {
  @Expose()
  @Type(() => OfferV03NftDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV03NftDto })
  nft: OfferV03NftDto;

  @Expose()
  @Type(() => OfferV03FlagsDto)
  @ApiProperty({ type: OfferV03FlagsDto })
  flags: OfferV03FlagsDto;
}

export class DraftOfferV03Dto extends PickType(OfferV03Dto, ['borrower', 'lender', 'signature']) {
  @Expose()
  @Type(({ object }) => detectDraftOfferNftType(object as DraftOfferV03Dto))
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferV03NftAssetDto })
  nft: DraftOfferV03NftAssetDto | DraftOfferV03NftCollectionDto;

  @Expose()
  @Type(() => DraftOfferTypeTermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferTypeTermsDto })
  terms: DraftOfferTypeTermsDto;

  @Expose()
  @IsEnum(OfferType)
  @ApiProperty({ enum: OfferType })
  type: OfferType;
}

export const ResponseOfferV03Dto = getResponseBodyDto(OfferV03Dto);
export const PaginatedResponseOfferV03Dto = getResponsePaginatedBodyDto(OfferV03Dto);
