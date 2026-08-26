import { Collection } from '../collection';
import { Offer } from './offer.entity';

export const OFFER_TABLE_NAME = 'offers';

export enum OfferType {
  Asset = 'asset',
  Collection = 'collection',
  Contract = 'contract'
}

export enum OfferStatus {
  Active = 'active',
  Deleted = 'deleted'
}

export type DraftOffer = Pick<
  Offer,
  | 'type'
  | 'borrower'
  | 'lender'
  | 'lenderNonce'
  | 'nftContract'
  | 'nftTokenIdFrom'
  | 'nftTokenIdTo'
  | 'currency'
  | 'principal'
  | 'repaymentMax'
  | 'originationFee'
  | 'apr'
  | 'eapr'
  | 'duration'
  | 'expiresAt'
  | 'prorated'
  | 'signature'
> & { collection: Pick<Collection, 'id'> };

export type FindConditions = Partial<
  Pick<Offer, 'type' | 'borrower' | 'lender' | 'nftContract' | 'currency'> & {
    id: number;
    lenderNe: string;
    borrowerNe: string;
    typeIn: OfferType[];
    durationNin: number[];
    duration: number;
    aprLte: number;
    prorated: boolean;
    lenderNonce: string;
    nftTokenId: string;
    collectionIds: number[];
    withDeleted: boolean;
  }
>;

export type OfferSortKeys = Pick<
  Offer,
  'principal' | 'repaymentMax' | 'apr' | 'duration' | 'expiresAt' | 'createdAt' | 'lender' | 'prorated'
> & {
  principalUsd: string;
  repaymentMaxUsd: string;
};
