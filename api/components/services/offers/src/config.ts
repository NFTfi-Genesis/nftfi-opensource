import path from 'path';
import dotenv from 'dotenv';
import { LoanContract, SupportedCurrencies } from '@nftfi.api/core';
import { OfferType as OfferTypeV1 } from '@nftfi.api/repositories/postgres/offer';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();

  const envSamplePath = path.join(__dirname, '../sample.env');
  const envOverridePath = path.join(__dirname, '../.env');

  dotenv.config({ path: envSamplePath, override: true });
  dotenv.config({ path: envOverridePath, override: true });
}

const redisUrl = new URL(process.env.REDIS_URI!);

const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  dapp: {
    url: process.env.NFTFI_URL,
    api: {
      uri: process.env.DAPP_API_BASE_URI
    }
  },
  postgres: {
    url: process.env.POSTGRES_URI!,
    debug: process.env.POSTGRES_DEBUG === 'true'
  },
  redis: {
    host: redisUrl.hostname ?? 'localhost',
    port: parseInt(redisUrl.port ?? '6379') as number
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL!
  },
  pagination: {
    limit: 20,
    page: 1
  },
  supportedCurrencies: new SupportedCurrencies({
    WETH: process.env.WETH_ADDRESS,
    DAI: process.env.DAI_ADDRESS,
    USDC: process.env.USDC_ADDRESS
  }),
  validation: {
    minimumLoanDurationSeconds: process.env.MINIMUM_LOAN_DURATION_SECONDS || 86400,
    createLimit: {
      [OfferTypeV1.Asset]: 10,
      [OfferTypeV1.Collection]: 10,
      [OfferTypeV1.Contract]: 10
    }
  },
  gnosis: {
    urlTransaction: process.env.GNOSIS_SAFE_TRANSACTION_SERVICE_API_URL!
  },
  integrators: process.env.INTEGRATORS,
  ethereum: {
    provider: {
      url: process.env.ETHEREUM_PROVIDER_URL!
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET
  },
  contracts: {
    nftfi: { escrowV3: process.env.NFTFI_V3_ESCROW_CONTRACT_ADDRESS }
  },
  legacy: {
    v03: {
      contractNameByType: {
        [OfferTypeV1.Asset]: LoanContract.V23Fixed,
        [OfferTypeV1.Collection]: LoanContract.V23FixedCollection,
        [OfferTypeV1.Contract]: LoanContract.V23FixedCollection
      },
      adminFeeBps: 200
    }
  },
  renegotiation: {
    maxDurationSeconds: process.env.RENEGOTIATION_MAX_DURATION_SECONDS
      ? parseInt(process.env.RENEGOTIATION_MAX_DURATION_SECONDS)
      : 365 * 86400
  }
};

export type Config = Required<typeof config>;

export default (): Config => config;
