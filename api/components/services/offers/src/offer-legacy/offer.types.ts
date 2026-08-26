export enum OfferType {
  Asset = 'v3.asset',
  Collection = 'v3.collection'
}

type SortFieldOptions =
  | 'expiry'
  | 'contractName'
  | 'lender'
  | 'loanDuration'
  | 'loanPrincipalAmount'
  | 'maximumRepaymentAmount'
  | 'offerDate'
  | 'apr'
  | 'effectiveApr'
  | 'interestProrated'
  | 'isProRata'
  | 'interestPercentage';

type SortDirectionOptions = 'asc' | 'desc';
export type SortOptions = { sort?: SortFieldOptions; direction?: SortDirectionOptions };
export type PaginationOptions = { limit?: number; page?: number };

export type Config = {
  pagination: { limit: number; page: number };
};

export type FindByFilters = Partial<{
  nftAddress: string;
  nftId: string;
  lenderAddress: string;
  borrowerAddress: string;
  isDeleted: boolean;
  nonce: string;
  contractName: string;
  contractNameIn: string[];
  typeIn: string[];
  typeNin: string[];
  termsCurrencyAddress: string;
  termsDuration: string | number;
  termsDurationNin: number[];
  termsAprLte: string | number;
  termsEffectiveAprLte: string | number;
  lenderAddressNe: string;
  borrowerAddressNe: string;
  type: string;
  interestProrated: boolean;
  account: string;
}>;
