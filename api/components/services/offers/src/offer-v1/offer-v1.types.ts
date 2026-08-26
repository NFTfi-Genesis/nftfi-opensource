import { Config } from '../config';

export interface OfferV1Integrator {
  integrator: string;
  apiKeys: string[];
  nftAddresses: string[];
}

export interface OfferV1Config {
  integrators: string;
  contracts: Config['contracts'];
}

export const DELETE_REASON_LOAN_STARTED = 'LOAN_STARTED';
export const DELETE_REASON_EXPIRED = 'EXPIRED';

export const OffersV1CacheScope = 'offers-v1';
