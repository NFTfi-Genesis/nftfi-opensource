import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class LoanV02TermsLoanInterestDto {
  @Expose()
  @ApiProperty({ type: Boolean })
  prorated: boolean;

  @Expose()
  @ApiProperty({ type: Number })
  bps: number;
}

class LoanV02TermsLoanDto {
  @Expose()
  @ApiProperty({ type: Number })
  duration: number;

  @Expose()
  @ApiProperty({ type: String })
  repayment: string;

  @Expose()
  @ApiProperty({ type: String })
  principal: string;

  @Expose()
  @ApiProperty({ type: String })
  origination?: string;

  @Expose()
  @ApiProperty({ type: Number })
  apr: number;

  @Expose()
  @ApiProperty({ type: Number })
  effectiveApr?: number;

  @Expose()
  @Type(() => LoanV02TermsLoanInterestDto)
  @ApiProperty({ type: LoanV02TermsLoanInterestDto })
  interest: LoanV02TermsLoanInterestDto;

  @Expose()
  @ApiProperty({ type: String })
  currency: string;

  @Expose()
  @ApiProperty({ type: String })
  unit: string;
}

export class LoanV02TermsDto {
  @Expose()
  @Type(() => LoanV02TermsLoanDto)
  @ApiProperty({ type: LoanV02TermsLoanDto })
  loan: LoanV02TermsLoanDto;
}
