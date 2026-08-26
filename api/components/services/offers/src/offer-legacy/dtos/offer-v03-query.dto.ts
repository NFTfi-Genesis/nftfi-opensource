import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, plainToClass, Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsEthereumAddress,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested
} from 'class-validator';
import { BigNumber } from 'ethers';
import { LoanContract } from '@nftfi.api/core';
import { PaginationDto, transformers } from '@nftfi.api/validation';
import { OfferType } from '../offer.types';
import { OfferV03TermsQueryDto } from './offer-v03-terms-query.dto';
import { OfferV03SortQueryDto } from './offer-v03-sort-query.dto';

export class OfferV03BalanceDto {
  @Expose()
  @Transform(transformers.toLowerCase)
  @IsString()
  @IsEthereumAddress()
  currency: string;

  @Expose()
  @IsNumberString()
  balance: string;
}

const toBalances = ({ value }: TransformFnParams): OfferV03BalanceDto[] => {
  if (typeof value === 'string') {
    const entries = value.trim().split(',');
    return entries.map(entry => {
      const [currency, balance] = entry.split(':');
      return plainToClass(OfferV03BalanceDto, { currency, balance: BigNumber.from(balance).toString() });
    });
  }

  return value;
};

export class OfferV03QueryDto extends IntersectionType(PaginationDto, OfferV03TermsQueryDto, OfferV03SortQueryDto) {
  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  borrowerAddressNe: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  lenderAddressNe: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @ValidateIf((v: OfferV03QueryDto) => !v.borrowerAddress && !v.nftAddress)
  @ApiProperty({ type: String, required: false })
  lenderAddress: string;

  @Expose()
  @Transform(toBalances)
  @Type(() => OfferV03BalanceDto)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @ApiProperty({
    type: String,
    example: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6:100000000,0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844:5000'
  })
  lenderBalances: OfferV03BalanceDto[];

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @ValidateIf((v: OfferV03QueryDto) => !v.lenderAddress && !v.nftAddress)
  @ApiProperty({ type: String, required: false })
  borrowerAddress: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @ValidateIf((v: OfferV03QueryDto) => !v.lenderAddress && !v.borrowerAddress)
  @ApiProperty({ type: String, required: false })
  nftAddress: string;

  @Expose()
  @IsEnum(LoanContract)
  @IsOptional()
  @ApiProperty({ enum: LoanContract, required: false })
  contractName: LoanContract;

  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @IsEnum(LoanContract, { each: true })
  @IsOptional()
  @ApiProperty({ enum: LoanContract, isArray: true, required: false })
  contractNameIn: LoanContract[];

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
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean, required: false })
  interestProrated: boolean;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  nftId: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  offerId: string;

  @Expose()
  @Transform(transformers.toBoolean)
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ type: Boolean, required: false })
  withDeleted: boolean;
}
