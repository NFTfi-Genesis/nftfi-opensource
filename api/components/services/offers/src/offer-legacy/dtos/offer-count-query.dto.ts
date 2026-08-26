import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

import { transformers } from '@nftfi.api/validation';

export class OfferCountQueryDto {
  @Expose()
  @Transform(transformers.toLowerCase)
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  lenderAddress: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ type: String })
  nftId: string;

  @Expose()
  @Transform(transformers.toLowerCase)
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  nftAddress: string;

  @Expose()
  @IsIn(['termsCurrencyAddress'])
  @ApiProperty({ type: String })
  group: string;
}
