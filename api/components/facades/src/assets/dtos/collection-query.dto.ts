import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsEthereumAddress, IsNumber, IsOptional } from 'class-validator';
import { PaginationDto, transformers } from '@nftfi.api/validation';
import { CollectionProjection } from '../assets.types';
import { AssetKeysDto } from './asset-keys.dto';

export class CollectionQueryDto extends PaginationDto {
  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @ApiProperty({ type: String, isArray: true, required: false })
  @IsEthereumAddress({ each: true })
  @IsArray()
  @IsOptional()
  contracts?: string[];

  @Expose()
  @Transform(transformers.toBoolean)
  @ApiProperty({ type: Boolean, required: false })
  @IsBoolean()
  @IsOptional()
  whitelisted?: boolean;

  @Expose()
  @Transform(transformers.toArrayOfNumbers)
  @ApiProperty({ type: Number, isArray: true, required: false })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  ids?: number[];

  @Expose({ name: 'loan-total-usd-min' })
  @Transform(transformers.toNumber)
  @ApiProperty({ name: 'loan-total-usd-min', type: Number, required: false })
  @IsNumber()
  @IsOptional()
  loanTotalUsdMin?: number;

  @Expose({ name: 'loan-total-usd-max' })
  @Transform(transformers.toNumber)
  @ApiProperty({ name: 'loan-total-usd-max', type: Number, required: false })
  @IsNumber()
  @IsOptional()
  loanTotalUsdMax?: number;

  @Expose({ name: 'loan-avg-usd-min' })
  @Transform(transformers.toNumber)
  @ApiProperty({ name: 'loan-avg-usd-min', type: Number, required: false })
  @IsNumber()
  @IsOptional()
  loanAvgUsdMin?: number;

  @Expose({ name: 'loan-avg-usd-max' })
  @Transform(transformers.toNumber)
  @ApiProperty({ name: 'loan-avg-usd-max', type: Number, required: false })
  @IsNumber()
  @IsOptional()
  loanAvgUsdMax?: number;

  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @ApiProperty({ enum: CollectionProjection, isArray: true, required: false })
  @IsEnum(CollectionProjection, { each: true })
  @IsOptional()
  projection?: CollectionProjection[];
}

export class GetCollectionsByKeysDto extends IntersectionType(
  AssetKeysDto,
  PickType(CollectionQueryDto, ['projection'] as const)
) {}
