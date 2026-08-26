import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ListingV01NftProjectDto {
  @Expose()
  @ApiProperty()
  name: string | null;
}

class ListingV01NftDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  address: string;

  @Expose()
  @ApiProperty()
  name: string | null;

  @Expose()
  @ApiProperty({ type: ListingV01NftProjectDto })
  @Type(() => ListingV01NftProjectDto)
  project: ListingV01NftProjectDto;
}

class ListingV01BorrowerDto {
  @Expose()
  @ApiProperty()
  address: string;
}

class ListingV01TermsLoanDto {
  @Expose()
  @ApiProperty()
  duration: number | null;

  @Expose()
  @ApiProperty()
  repayment: string | null;

  @Expose()
  @ApiProperty()
  principal: string | null;

  @Expose()
  @ApiProperty()
  currency: string | null;

  @Expose()
  @ApiProperty()
  unit: string | null;
}

class ListingV01TermsDto {
  @Expose()
  @ApiProperty({ type: ListingV01TermsLoanDto })
  @Type(() => ListingV01TermsLoanDto)
  loan: ListingV01TermsLoanDto;
}

class ListingV01DateDto {
  @Expose()
  @ApiProperty()
  listed: Date;
}

class ListingV01NftfiContractDto {
  @Expose()
  @ApiProperty()
  name: string;
}

class ListingV01NftfiDto {
  @Expose()
  @ApiProperty({ type: ListingV01NftfiContractDto })
  @Type(() => ListingV01NftfiContractDto)
  contract: ListingV01NftfiContractDto;
}

export class ListingV01ItemDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ type: ListingV01DateDto })
  @Type(() => ListingV01DateDto)
  date: ListingV01DateDto;

  @Expose()
  @ApiProperty({ type: ListingV01NftDto })
  @Type(() => ListingV01NftDto)
  nft: ListingV01NftDto;

  @Expose()
  @ApiProperty({ type: ListingV01BorrowerDto })
  @Type(() => ListingV01BorrowerDto)
  borrower: ListingV01BorrowerDto;

  @Expose()
  @ApiProperty({ type: ListingV01TermsDto })
  @Type(() => ListingV01TermsDto)
  terms: ListingV01TermsDto;

  @Expose()
  @ApiProperty({ type: ListingV01NftfiDto })
  @Type(() => ListingV01NftfiDto)
  nftfi: ListingV01NftfiDto;
}
