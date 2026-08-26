import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsEnum, IsEthereumAddress, IsNumberString, IsOptional, IsString } from 'class-validator';
import { RenegotiationParty, RenegotiationStatus } from '@nftfi.api/repositories/postgres/renegotiation';
import { PaginationDto, transformers } from '@nftfi.api/validation';

export enum RenegotiationV1SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export enum RenegotiationV1SortField {
  CreatedAt = 'createdAt',
  ExpiresAt = 'expiresAt'
}

export class RenegotiationV1SortQueryDto {
  @Expose()
  @Transform(({ value }) => value || RenegotiationV1SortField.CreatedAt)
  @IsEnum(RenegotiationV1SortField)
  @IsOptional()
  @ApiProperty({ enum: RenegotiationV1SortField, required: false })
  sort: RenegotiationV1SortField;

  @Expose()
  @Transform(({ value }) => value || RenegotiationV1SortDirection.Desc)
  @IsEnum(RenegotiationV1SortDirection)
  @IsOptional()
  @ApiProperty({ enum: RenegotiationV1SortDirection, required: false })
  direction: RenegotiationV1SortDirection;
}

export class RenegotiationV1QueryDto extends IntersectionType(PaginationDto, RenegotiationV1SortQueryDto) {
  @Expose()
  @IsNumberString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  loanId: string;

  @Expose()
  @IsString()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  contract: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  lender: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  borrower: string;

  @Expose()
  @IsEnum(RenegotiationParty)
  @IsOptional()
  @ApiProperty({ enum: RenegotiationParty, required: false })
  party: RenegotiationParty;

  @Expose()
  @IsEnum(RenegotiationStatus)
  @IsOptional()
  @ApiProperty({ enum: RenegotiationStatus, required: false })
  status: RenegotiationStatus;

  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @IsArray()
  @IsEnum(RenegotiationStatus, { each: true })
  @IsOptional()
  @ApiProperty({ enum: RenegotiationStatus, isArray: true, required: false })
  statusIn: RenegotiationStatus[];
}
