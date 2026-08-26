import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListingLegacyDto {
  // Fields from our DB
  @Expose()
  @ApiProperty()
  nftCollateralContract: string;

  @Expose()
  @ApiProperty()
  nftCollateralId: string;

  @Expose()
  @ApiProperty()
  nftKey: string;

  @Expose()
  @ApiProperty()
  borrower: string;

  @Expose()
  @ApiProperty()
  desiredLoanDuration: string;

  @Expose()
  @ApiProperty()
  desiredLoanCurrency: string | null;

  @Expose()
  @ApiProperty()
  desiredIsProRata: boolean | null;

  @Expose()
  @ApiProperty()
  desiredPreference: string | null;

  @Expose()
  @ApiProperty()
  listedDate: Date;

  // Asset metadata (from AssetsFacade enrichment)
  @Expose()
  @ApiProperty()
  name: string | null;

  @Expose()
  @ApiProperty()
  projectName: string | null;

  @Expose()
  @ApiProperty()
  imageUrl: string | null;

  // Hardcoded fields
  @Expose()
  @ApiProperty()
  contractName: string;

  @Expose()
  @ApiProperty()
  status: string;

  @Expose()
  @ApiProperty()
  whitelisted: boolean;

  @Expose()
  @ApiProperty()
  isDeleted: boolean;

  // Null fields (not stored in new DB)
  @Expose()
  @ApiProperty()
  nonce: null;

  @Expose()
  @ApiProperty()
  listedBy: null;

  @Expose()
  @ApiProperty()
  signedMessage: null;

  @Expose()
  @ApiProperty()
  desiredLoanPrincipalAmount: null;

  @Expose()
  @ApiProperty()
  desiredLoanCurrencyContract: null;

  @Expose()
  @ApiProperty()
  desiredRepaymentAmount: null;

  @Expose()
  @ApiProperty()
  minLoanDuration: null;

  @Expose()
  @ApiProperty()
  maxLoanDuration: null;

  @Expose()
  @ApiProperty()
  maximumRepaymentAmount: null;

  @Expose()
  @ApiProperty()
  revenueSharePartner: null;

  @Expose()
  @ApiProperty()
  loanInterestRateForDurationInBasisPoints: null;

  @Expose()
  @ApiProperty()
  referralFeeInBasisPoints: null;
}
