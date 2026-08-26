import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { OfferAddressDto, OfferTypeDto } from './offer.dto';
import { OfferNftDto } from './offer-nft.dto';
import { OfferNftfiDto } from './offer-nftfi.dto';

export class OfferCountFiltersNftDto extends PickType(OfferNftDto, ['address', 'id']) {}
export class OfferCountFiltersNftfiDto extends PickType(OfferNftfiDto, ['contract']) {}

class OfferCountFiltersDto {
  @Expose()
  @ApiProperty({ type: OfferCountFiltersNftDto })
  @Type(() => OfferCountFiltersNftDto)
  nft: OfferCountFiltersNftDto;

  @Expose()
  @ApiProperty({ type: OfferAddressDto })
  @Type(() => OfferAddressDto)
  lender: OfferAddressDto;

  @Expose()
  @ApiProperty({ type: OfferCountFiltersNftfiDto })
  @Type(() => OfferCountFiltersNftfiDto)
  nftfi: OfferCountFiltersNftfiDto;

  @Expose()
  @Type(() => OfferTypeDto)
  @ApiProperty({ type: OfferTypeDto })
  type: string;
}

class OfferCountItemGroupDto {
  @Expose()
  @ApiProperty({ type: String })
  key: string;

  @Expose()
  @ApiProperty({ type: String })
  value: string;
}

export class OfferCountItemDto {
  @Expose()
  @ApiProperty({ type: OfferCountItemGroupDto })
  @Type(() => OfferCountItemGroupDto)
  group: OfferCountItemGroupDto;

  @Expose()
  @ApiProperty({ type: Number })
  count: number;
}

export class OfferCountDto {
  @Expose()
  @ApiProperty({ type: OfferCountFiltersDto })
  @Type(() => OfferCountFiltersDto)
  filters: OfferCountFiltersDto;

  @Expose()
  @ApiProperty({ type: [OfferCountItemDto] })
  @Type(() => OfferCountItemDto)
  counts: OfferCountItemDto[];
}
