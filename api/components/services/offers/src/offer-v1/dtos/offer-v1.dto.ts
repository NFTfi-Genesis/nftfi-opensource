import { ApiExtraModels, ApiProperty, PickType, getSchemaPath } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { getResponseBodyDto, getResponsePaginatedBodyDto } from '@nftfi.api/core/dtos';
import { OfferStatus, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { AssetDto, CollectionDto } from '@nftfi.api/facades/assets/dtos';
import { DraftOfferV1AssetNftDto, DraftOfferV1CollectionNftDto, DraftOfferV1ContractNftDto } from './offer-v1-nft.dto';
import { DraftOfferV1TermsDto, OfferV1TermsDto } from './offer-v1-terms.dto';

export class OfferV1AddressDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  address: string;
}

class OfferV1LenderDto extends OfferV1AddressDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  nonce: string;
}

class OfferV1TokenRangeDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String, description: 'Lower bound (inclusive) of the token id range covered by the offer' })
  from: string;

  @Expose()
  @IsString()
  @ApiProperty({ type: String, description: 'Upper bound (inclusive) of the token id range covered by the offer' })
  to: string;
}

@ApiExtraModels(AssetDto, CollectionDto)
export class OfferV1Dto {
  @Expose()
  @IsInt()
  @ApiProperty({ type: Number, readOnly: true })
  id: number;

  @Expose()
  @IsEnum(OfferType)
  @ApiProperty({ enum: OfferType })
  type: OfferType;

  @Expose()
  @IsEnum(OfferStatus)
  @ApiProperty({ enum: OfferStatus, readOnly: true })
  status: OfferStatus;

  @Expose()
  @Type(() => OfferV1LenderDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV1LenderDto })
  lender: OfferV1LenderDto;

  @Expose()
  @Type(() => OfferV1AddressDto)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiProperty({ type: OfferV1AddressDto, required: false })
  borrower?: OfferV1AddressDto;

  @Expose()
  @Type(() => CollectionDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: CollectionDto, readOnly: true })
  collection: CollectionDto;

  @Expose()
  @Type(() => AssetDto)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiProperty({ type: AssetDto, required: false, readOnly: true })
  asset?: AssetDto;

  @Expose()
  @Type(() => OfferV1TokenRangeDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV1TokenRangeDto, readOnly: true })
  tokenRange: OfferV1TokenRangeDto;

  @Expose()
  @Type(() => OfferV1TermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV1TermsDto })
  terms: OfferV1TermsDto;

  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  signature: string | null;

  @Expose()
  @Type(() => Date)
  @ApiProperty({ type: Date, readOnly: true })
  createdAt: Date;
}

@ApiExtraModels(DraftOfferV1AssetNftDto, DraftOfferV1CollectionNftDto, DraftOfferV1ContractNftDto)
export class DraftOfferV1Dto extends PickType(OfferV1Dto, ['type', 'lender', 'borrower', 'signature']) {
  @Expose()
  @Type(options => {
    const parentType = (options?.object as DraftOfferV1Dto)?.type;
    if (parentType === OfferType.Asset) return DraftOfferV1AssetNftDto;
    if (parentType === OfferType.Contract) return DraftOfferV1ContractNftDto;
    return DraftOfferV1CollectionNftDto;
  })
  @ValidateNested()
  @IsObject()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(DraftOfferV1AssetNftDto) },
      { $ref: getSchemaPath(DraftOfferV1CollectionNftDto) },
      { $ref: getSchemaPath(DraftOfferV1ContractNftDto) }
    ]
  })
  nft: DraftOfferV1AssetNftDto | DraftOfferV1CollectionNftDto | DraftOfferV1ContractNftDto;

  @Expose()
  @Type(() => DraftOfferV1TermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferV1TermsDto })
  terms: DraftOfferV1TermsDto;
}

export const ResponseOfferV1Dto = getResponseBodyDto(OfferV1Dto);
export const PaginatedResponseOfferV1Dto = getResponsePaginatedBodyDto(OfferV1Dto);
