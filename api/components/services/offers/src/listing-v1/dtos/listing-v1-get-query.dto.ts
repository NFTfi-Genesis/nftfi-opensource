import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsEthereumAddress, IsNumber, IsOptional } from 'class-validator';
import { PaginationDto, SortingDto, transformers } from '@nftfi.api/validation';

export enum ListingSortBy {
  CreatedAt = 'createdAt'
}

export class ListingV1GetQueryDto extends IntersectionType(PaginationDto, SortingDto<ListingSortBy>) {
  @ApiProperty({ type: String, enum: ListingSortBy, required: false })
  @IsEnum(ListingSortBy)
  @IsOptional()
  sortBy: ListingSortBy;

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of collection IDs' })
  @Transform(transformers.toArrayOfNumbers)
  @IsNumber({}, { each: true })
  @IsOptional()
  collectionIds?: number[];

  @Expose()
  @ApiProperty({ type: String, required: false })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  borrower?: string;

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Currency contract address' })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  currency?: string;

  @Expose()
  @ApiProperty({ type: Number, required: false, description: 'Exact duration in seconds' })
  @Transform(transformers.toNumber)
  @IsNumber()
  @IsOptional()
  duration?: number;
}
