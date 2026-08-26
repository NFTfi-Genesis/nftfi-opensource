import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsEthereumAddress, IsNumber, IsNumberString, IsOptional, IsBoolean } from 'class-validator';
import { transformers } from '@nftfi.api/validation';
import { ListingPreference } from '@nftfi.api/repositories/postgres/listing';

export class ListingV1CreateBodyDto {
  @Expose()
  @ApiProperty({ description: 'NFT contract address' })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  nftContract: string;

  @Expose()
  @ApiProperty({ description: 'NFT token ID' })
  @IsNumberString()
  nftTokenId: string;

  @Expose()
  @ApiProperty({ description: 'Borrower wallet address' })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  borrower: string;

  @Expose()
  @ApiProperty({ type: Number, description: 'Duration in seconds' })
  @IsNumber()
  duration: number;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Currency contract address, null = any' })
  @Transform(transformers.toLowerCase)
  @IsEthereumAddress()
  @IsOptional()
  currency: string | null;

  @Expose()
  @ApiProperty({ nullable: true, description: 'Pro-rated interest, null = any' })
  @IsBoolean()
  @IsOptional()
  prorated: boolean | null;

  @Expose()
  @ApiProperty({ enum: ListingPreference })
  @IsEnum(ListingPreference)
  preference: ListingPreference;
}
