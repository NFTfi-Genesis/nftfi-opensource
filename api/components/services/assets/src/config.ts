import path from 'path';
import dotenv from 'dotenv';
import { getBaseDir, SupportedCurrencies } from '@nftfi.api/core';
import {
  ASSET_SIZES,
  COLLECTION_DEFAULTS,
  COLLECTION_SIZES,
  IMAGE_PLACEHOLDER_URL,
  NPF_FORWARDED_COLLECTIONS
} from './constants';
import { DEFAULT_MEDIA_MAX_BYTES } from './media-processor.types';

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
  baseDir: getBaseDir(process.env.BASE_DIR),
  redis: {
    host: redisUrl.hostname ?? 'localhost',
    port: parseInt(redisUrl.port ?? '6379') as number
  },
  postgres: {
    url: process.env.POSTGRES_URI!,
    debug: process.env.POSTGRES_DEBUG === 'true'
  },
  gcloud: {
    projectId: process.env.GCLOUD_PROJECT_ID
  },
  buckets: {
    assets: process.env.ASSETS_BUCKET
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL!
  },
  alchemy: {
    url: process.env.ALCHEMY_API_URL,
    key: process.env.ALCHEMY_API_KEY
  },
  opensea: {
    url: process.env.OPENSEA_API_URL,
    key: process.env.OPENSEA_API_KEY
  },
  ethereum: {
    provider: {
      url: process.env.ETHEREUM_PROVIDER_URL!
    }
  },
  fxrate: {
    startDate: new Date('2020-01-01')
  },
  npf: {
    url: process.env.NPF_API_URL,
    key: process.env.NPF_API_KEY,
    historicalEnabled: process.env.NPF_HISTORICAL_ENABLED === 'true',
    forwardedCollections: NPF_FORWARDED_COLLECTIONS
  },
  images: {
    asset: ASSET_SIZES,
    project: COLLECTION_SIZES,
    defaults: COLLECTION_DEFAULTS,
    placeholder: IMAGE_PLACEHOLDER_URL,
    maxBytes: process.env.MEDIA_MAX_BYTES ? parseInt(process.env.MEDIA_MAX_BYTES, 10) : DEFAULT_MEDIA_MAX_BYTES
  },
  resourceGuard: {
    enabled: process.env.RESOURCE_GUARD_ENABLED !== 'false',
    memoryThreshold: parseFloat(process.env.RESOURCE_GUARD_MEMORY_THRESHOLD ?? '0.85'),
    heapThreshold: parseFloat(process.env.RESOURCE_GUARD_HEAP_THRESHOLD ?? '0.85'),
    memoryLimitOverrideBytes: process.env.POD_MEMORY_LIMIT_BYTES
      ? parseInt(process.env.POD_MEMORY_LIMIT_BYTES, 10)
      : null
  },
  supportedCurrencies: new SupportedCurrencies({
    WETH: process.env.WETH_ADDRESS,
    DAI: process.env.DAI_ADDRESS,
    USDC: process.env.USDC_ADDRESS,
    USDC_AAVE: process.env.USDC_AAVE_ADDRESS
  })
};

export type Config = typeof config;

export default (): Config => config;
