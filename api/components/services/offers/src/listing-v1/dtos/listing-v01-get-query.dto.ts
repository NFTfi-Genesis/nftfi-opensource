import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { PaginationDto, transformers } from '@nftfi.api/validation';

export class ListingV01GetQueryDto extends PaginationDto {
  @Expose()
  @ApiProperty({ type: String, required: false, description: 'Comma-separated list of NFT contract addresses' })
  @Transform(transformers.toArrayOfLowercasedAddresses)
  @IsOptional()
  nftAddresses?: string[];
}
