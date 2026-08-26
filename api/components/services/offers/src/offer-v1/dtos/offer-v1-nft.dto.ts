import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNumberString, IsObject, IsString, ValidateNested } from 'class-validator';
import { IsGreaterThan } from '@nftfi.api/validation';

export class OfferV1NftTokenIdDto {
  @Expose()
  @IsNumberString()
  @ApiProperty({ type: String })
  from: string;

  @Expose()
  @IsNumberString()
  @IsGreaterThan('from')
  @ApiProperty({ type: String })
  to: string;
}

export class DraftOfferV1AssetNftDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  contract: string;

  @Expose()
  @IsNumberString()
  @ApiProperty({ type: String })
  tokenId: string;
}

export class DraftOfferV1CollectionNftDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  contract: string;

  @Expose()
  @Type(() => OfferV1NftTokenIdDto)
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: OfferV1NftTokenIdDto })
  tokenId: OfferV1NftTokenIdDto;
}

export class DraftOfferV1ContractNftDto {
  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  contract: string;
}
