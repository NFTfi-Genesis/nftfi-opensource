import { Offer, OfferType } from '../../src/postgres/offer';

export const buildPostgresOffer = (overrides: Partial<Offer> = {}): Offer =>
  ({
    id: 1,
    type: OfferType.Asset,
    borrower: '0xborrower',
    lender: '0xlender',
    lenderNonce: '1',
    nftContract: '0xnft',
    nftTokenIdFrom: '1',
    nftTokenIdTo: '1',
    collection: { id: 1 },
    currency: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    principal: '1000000000000000000',
    repaymentMax: '1100000000000000000',
    originationFee: '0',
    apr: 10,
    eapr: 10,
    duration: 86400,
    expiresAt: new Date('2033-05-18T03:33:19.000Z'),
    prorated: false,
    signature: '0xsignature',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as Offer);
