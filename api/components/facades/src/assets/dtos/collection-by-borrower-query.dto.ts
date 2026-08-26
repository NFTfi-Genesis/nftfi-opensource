import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import { PaginationDto, transformers } from '@nftfi.api/validation';

export class CollectionByBorrowerQueryDto extends PaginationDto {
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
}
