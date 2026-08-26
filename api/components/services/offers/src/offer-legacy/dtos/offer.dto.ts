import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { OfferType } from '../offer.types';
import { DraftOfferNftDto, OfferNftDto } from './offer-nft.dto';
import { DraftOfferTermsDto, DraftOfferTypeTermsDto, OfferTermsDto } from './offer-terms.dto';
import { OfferNftfiDto } from './offer-nftfi.dto';

export class OfferTypeDto {
  @Expose()
  @ApiProperty({ enum: OfferType })
  @IsString()
  type: OfferType;
}

class OfferDateDto {
  @Expose()
  @Type(() => Date)
  @ApiProperty({ type: Date })
  offered: Date;
}

export class OfferAddressDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  address: string;
}

class OfferLenderDto extends OfferAddressDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  nonce: string;
}

export class OfferDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ enum: OfferType })
  type?: OfferType;

  @Expose()
  @Type(() => OfferDateDto)
  @ApiProperty({ type: OfferDateDto })
  date: OfferDateDto;

  @Expose()
  @Type(() => OfferNftDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferNftDto })
  nft: OfferNftDto;

  @Expose()
  @Type(() => OfferLenderDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferLenderDto })
  lender: OfferLenderDto;

  @Expose()
  @Type(() => OfferAddressDto)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiProperty({ type: OfferAddressDto, required: false })
  borrower?: OfferAddressDto;

  @Expose()
  @Type(() => OfferAddressDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferAddressDto })
  referrer?: OfferAddressDto;

  @Expose()
  @Type(() => OfferTermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferTermsDto })
  terms: OfferTermsDto;

  @Expose()
  @ApiProperty({ type: String })
  @IsString()
  signature: string | null;

  @Expose()
  @Type(() => OfferNftfiDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferNftfiDto })
  nftfi?: OfferNftfiDto;

  @Expose()
  @ApiProperty({ type: Boolean })
  deleted: boolean;
}

export class DraftOfferDto extends PickType(OfferDto, ['borrower', 'lender', 'referrer', 'signature', 'nftfi']) {
  @Expose()
  @Type(() => DraftOfferNftDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferNftDto })
  nft: DraftOfferNftDto;

  @Expose()
  @Type(() => DraftOfferTermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferTermsDto })
  terms: DraftOfferTermsDto;
}

export class DraftOfferTypeDto extends PickType(OfferDto, ['borrower', 'lender', 'signature']) {
  @Expose()
  @Type(() => DraftOfferNftDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferNftDto })
  nft: DraftOfferNftDto;

  @Expose()
  @Type(() => DraftOfferTermsDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DraftOfferTermsDto })
  terms: DraftOfferTypeTermsDto;

  @Expose()
  @ApiProperty({ enum: OfferType })
  type: OfferType;
}
