import { Renegotiation, RenegotiationParty, RenegotiationStatus } from '../../src/postgres/renegotiation';
import { buildPostgresMarketLoan } from './market-loan.factory';

export const buildPostgresRenegotiation = (overrides: Partial<Renegotiation> = {}): Renegotiation =>
  ({
    id: 1,
    loan: buildPostgresMarketLoan(),
    status: RenegotiationStatus.Active,
    party: RenegotiationParty.Borrower,
    borrower: '0xborrower',
    lender: '0xlender',
    lenderNonce: null,
    duration: 86400,
    renegotiationFee: '10000000000000000',
    expiresAt: new Date('2099-06-19T23:30:18.000Z'),
    signature: null,
    message: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as Renegotiation);
