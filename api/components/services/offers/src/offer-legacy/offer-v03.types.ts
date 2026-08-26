import { Config } from '../config';
import { OfferV03QueryDto } from './dtos';

export interface OfferV03Config {
  gnosis: {
    urlTransaction: string;
  };
  validation: Config['validation'];
  pagination: Config['pagination'];
  integrators: string;
  contracts: {
    nftfi: { escrowV3: string };
  };
  legacy: Config['legacy'];
}

export type DtoTransformParams = Partial<Pick<OfferV03QueryDto, 'lenderBalances'>>;

export interface Integrator {
  integrator: string;
  apiKeys: string[];
  nftAddresses: string[];
}

export const CACHE_GNOSIS_KEY = 'middleware.authorize.isGnosisSafeOwner.safes';
export const CACHE_GNOSIS_TTL = 3600 * 12;
