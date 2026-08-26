import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsEnum, IsEthereumAddress, IsNumber, IsOptional, Min } from 'class-validator';
import { transformers } from '@nftfi.api/validation';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';

export class AnalyticsV1QueryDto {
  @Expose()
  @ApiProperty({ type: Number, required: false, description: 'Number of days to look ahead for loans due' })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(1)
  @IsOptional()
  daysFromNow?: number;

  @Expose()
  @ApiProperty({
    type: String,
    enum: MarketLoanProtocol,
    required: false,
    description: 'Comma-separated list of lowercased loan protocols'
  })
  @Transform(transformers.toArrayOfStrings)
  @IsEnum(MarketLoanProtocol, { each: true })
  @IsArray()
  @IsOptional()
  protocols?: MarketLoanProtocol[];

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of currency addresses' })
  @Transform(transformers.toArrayOfLowercasedAddresses)
  @IsEthereumAddress({ each: true })
  @IsOptional()
  currencies?: string[];

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
  lender?: string;

  @Expose()
  @ApiProperty({ type: String, required: false })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  borrower?: string;

  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of collection IDs' })
  @Transform(transformers.toArrayOfNumbers)
  @IsNumber({}, { each: true })
  @IsOptional()
  collectionIds?: number[];
}
