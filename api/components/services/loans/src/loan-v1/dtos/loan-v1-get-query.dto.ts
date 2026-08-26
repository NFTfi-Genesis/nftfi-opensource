import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsEthereumAddress, IsNumber, IsOptional } from 'class-validator';
import { PaginationDto, SortingDto, transformers } from '@nftfi.api/validation';
import { MarketLoanProtocol, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';

export enum SortBy {
  Protocol = 'protocol',
  CollectionName = 'collectionName',
  Principal = 'principal',
  Repayment = 'repayment',
  RepaymentMax = 'repaymentMax',
  Apr = 'apr',
  Duration = 'duration',
  StartedAt = 'startedAt',
  DueAt = 'dueAt',
  Lender = 'lender',
  Borrower = 'borrower'
}

export class LoanV1GetQueryDto extends IntersectionType(PaginationDto, SortingDto<SortBy>) {
  @ApiProperty({ type: String, enum: SortBy, required: false })
  @IsEnum(SortBy)
  sortBy: SortBy;

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of currency addresses' })
  @Transform(transformers.toArrayOfLowercasedAddresses)
  @IsEthereumAddress({ each: true })
  @IsOptional()
  currencies?: string[];

  @Expose()
  @ApiProperty({
    type: String,
    enum: MarketLoanProtocol,
    required: false,
    description: 'Comma-separated list of loan protocols'
  })
  @Transform(transformers.toArrayOfStrings)
  @IsEnum(MarketLoanProtocol, { each: true })
  @IsArray()
  @IsOptional()
  protocols?: MarketLoanProtocol[];

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
  wallet?: string;

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of wallet addresses' })
  @Transform(transformers.toArrayOfLowercasedAddresses)
  @IsEthereumAddress({ each: true })
  @IsOptional()
  wallets?: string[];

  @Expose()
  @ApiProperty({ type: String, required: false })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  borrower?: string;

  @Expose()
  @ApiProperty({ type: String, required: false })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  lender?: string;

  @Expose()
  @ApiProperty({ enum: MarketLoanStatus, required: false })
  @IsEnum(MarketLoanStatus)
  @IsOptional()
  status?: MarketLoanStatus;

  @Expose()
  @ApiProperty({
    type: String,
    enum: MarketLoanStatus,
    required: false,
    description: 'Comma-separated list of loan statuses'
  })
  @Transform(transformers.toArrayOfStrings)
  @IsEnum(MarketLoanStatus, { each: true })
  @IsArray()
  @IsOptional()
  statuses?: MarketLoanStatus[];

  @Expose()
  @ApiProperty({ type: Date, required: false, description: 'ISO 8601 date string' })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  @IsOptional()
  dueAtBefore?: Date;

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of NFT token IDs' })
  @Transform(transformers.toArrayOfStrings)
  @IsArray()
  @IsOptional()
  nftIds?: string[];
}
