import { MarketLoan } from '../market-loan';
import { Renegotiation } from './renegotiation.entity';

export const RENEGOTIATION_TABLE_NAME = 'renegotiations';

export enum RenegotiationStatus {
  Active = 'active',
  Accepted = 'accepted',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Replaced = 'replaced'
}

export enum RenegotiationParty {
  Borrower = 'borrower',
  Lender = 'lender'
}

export enum RenegotiationDeletedReason {
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
  Replaced = 'REPLACED',
  LoanEnded = 'LOAN_ENDED'
}

export type DraftRenegotiation = Pick<
  Renegotiation,
  | 'party'
  | 'borrower'
  | 'lender'
  | 'lenderNonce'
  | 'duration'
  | 'renegotiationFee'
  | 'expiresAt'
  | 'signature'
  | 'message'
> & {
  status: RenegotiationStatus;
  loan: Pick<MarketLoan, 'id'>;
};

export type FindConditions = Partial<
  Pick<Renegotiation, 'borrower' | 'lender' | 'party' | 'status'> & {
    id: number;
    loanId: string;
    contract: string;
    statusIn: RenegotiationStatus[];
    withDeleted: boolean;
  }
>;

export type RenegotiationSortKeys = Pick<Renegotiation, 'createdAt' | 'expiresAt'>;
