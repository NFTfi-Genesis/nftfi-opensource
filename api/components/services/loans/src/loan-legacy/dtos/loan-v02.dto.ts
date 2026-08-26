import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { getResponsePaginatedBodyDto } from '@nftfi.api/core/dtos';
import { LoanV02Status } from '../loan-v02.types';
import { LoanV02NftfiDto } from './loan-v02-nftfi.dto';
import { LoanV02DateDto } from './loan-v02-date.dto';
import { LoanV02TermsDto } from './loan-v02-terms.dto';
import { LoanV02NftDto } from './loan-v02-nft.dto';

export class LoanV02ParticipantDto {
  @Expose()
  @ApiProperty({ type: String })
  address: string;
}

export class LoanV02Dto {
  @Expose()
  @ApiProperty({ type: Number })
  id: number;

  @Expose()
  @ApiProperty({ enum: LoanV02Status })
  status: LoanV02Status;

  @Expose()
  @ApiProperty({ type: LoanV02DateDto })
  date: LoanV02DateDto;

  @Expose()
  @Type(() => LoanV02NftDto)
  @ApiProperty({ type: LoanV02NftDto })
  nft: LoanV02NftDto;

  @Expose()
  @Type(() => LoanV02ParticipantDto)
  @ApiProperty({ type: LoanV02ParticipantDto })
  borrower: LoanV02ParticipantDto;

  @Expose()
  @Type(() => LoanV02ParticipantDto)
  @ApiProperty({ type: LoanV02ParticipantDto })
  lender: LoanV02ParticipantDto;

  @Expose()
  @Type(() => LoanV02TermsDto)
  @ApiProperty({ type: LoanV02TermsDto })
  terms: LoanV02TermsDto;

  @Expose()
  @Type(() => LoanV02NftfiDto)
  @ApiProperty({ type: LoanV02NftfiDto })
  nftfi: LoanV02NftfiDto;
}

export const LoanV02ResponseDto = getResponsePaginatedBodyDto(LoanV02Dto);
