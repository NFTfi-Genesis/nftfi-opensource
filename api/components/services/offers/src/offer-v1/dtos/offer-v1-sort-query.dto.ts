import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export enum OfferV1SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export enum OfferV1SortField {
  CreatedAt = 'createdAt',
  Principal = 'principal',
  RepaymentMax = 'repaymentMax',
  Apr = 'apr',
  Duration = 'duration',
  ExpiresAt = 'expiresAt',
  Lender = 'lender',
  Prorated = 'prorated'
}

export class OfferV1SortQueryDto {
  @Expose()
  @Transform(({ value }) => value || OfferV1SortField.CreatedAt)
  @IsEnum(OfferV1SortField)
  @IsOptional()
  @ApiProperty({ enum: OfferV1SortField, required: false })
  sort: OfferV1SortField;

  @Expose()
  @Transform(({ value }) => value || OfferV1SortDirection.Desc)
  @IsEnum(OfferV1SortDirection)
  @IsOptional()
  @ApiProperty({ enum: OfferV1SortDirection, required: false })
  direction: OfferV1SortDirection;
}
