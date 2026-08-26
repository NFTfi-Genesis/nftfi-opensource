import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsEthereumAddress,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf
} from 'class-validator';
import { OfferType } from '@nftfi.api/repositories/postgres/offer';
import { PaginationDto, transformers } from '@nftfi.api/validation';
import { OfferV1SortQueryDto } from './offer-v1-sort-query.dto';

export class OfferV1QueryDto extends IntersectionType(PaginationDto, OfferV1SortQueryDto) {
  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @ValidateIf((v: OfferV1QueryDto) => !v.borrower && !v.nftContract && !v.collectionIds?.length)
  @ApiProperty({ type: String, required: false })
  lender: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @ValidateIf((v: OfferV1QueryDto) => !v.lender && !v.nftContract && !v.collectionIds?.length)
  @ApiProperty({ type: String, required: false })
  borrower: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @ValidateIf((v: OfferV1QueryDto) => !v.lender && !v.borrower && !v.collectionIds?.length)
  @ApiProperty({ type: String, required: false })
  nftContract: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  lenderNe: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  borrowerNe: string;

  @Expose()
  @IsEnum(OfferType)
  @IsOptional()
  @ApiProperty({ enum: OfferType, required: false })
  type: OfferType;

  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @IsEnum(OfferType, { each: true })
  @IsOptional()
  @ApiProperty({ enum: OfferType, isArray: true, required: false })
  typeIn: OfferType[];

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  currency: string;

  @Expose()
  @IsNumberString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  nftTokenId: string;

  @Expose()
  @Transform(transformers.toNumber)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ApiProperty({ type: Number, required: false })
  duration: number;

  @Expose()
  @Transform(transformers.toArrayOfNumbers)
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @IsOptional()
  @ApiProperty({ type: String, required: false, example: '86400,172800' })
  durationNin: number[];

  @Expose()
  @Transform(transformers.toArrayOfNumbers)
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @IsOptional()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of collection IDs' })
  collectionIds: number[];

  @Expose()
  @Transform(transformers.toNumber)
  @IsNumber()
  @IsOptional()
  @ApiProperty({ type: Number, required: false })
  aprLte: number;

  @Expose()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean, required: false })
  prorated: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  nonce: string;

  @Expose()
  @Transform(transformers.toBoolean)
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean, required: false })
  withDeleted: boolean;
}
