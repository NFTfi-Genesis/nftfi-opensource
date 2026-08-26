import path from 'path';
import dotenv from 'dotenv';
import { getNumEnv, SupportedCurrencies } from '@nftfi.api/core';

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
    url: process.env.NFTFI_URL!,
    api: {
      uri: process.env.DAPP_API_BASE_URI!
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
  ethereum: {
    provider: {
      url: process.env.ETHEREUM_PROVIDER_URL
    },
    replay: {
      enabled: process.env.ETHEREUM_EVENTS_REPLAY === 'true',
      chunkSize: parseInt(process.env.ETHEREUM_EVENTS_REPLAY_CHUNK_SIZE!) || 1000
    },
    contracts: {
      blur: {
        loanV1: {
          address: process.env.BLUR_LOAN_V1,
          replayBlock: getNumEnv('BLUR_LOAN_V1_REPLAY_BLOCK', 0)
        }
      },
      arcade: {
        loanV2: {
          address: process.env.ARCADE_LOAN_V2,
          replayBlock: getNumEnv('ARCADE_LOAN_V2_REPLAY_BLOCK', 0)
        },
        loanV3: {
          address: process.env.ARCADE_LOAN_V3,
          replayBlock: getNumEnv('ARCADE_LOAN_V3_REPLAY_BLOCK', 0)
        }
      },
      nftfi: {
        loanV1Fixed: {
          address: process.env.NFTFI_LOAN_V1_FIXED,
          replayBlock: getNumEnv('NFTFI_LOAN_V1_FIXED_REPLAY_BLOCK', 0)
        },
        loanV2Fixed: {
          address: process.env.NFTFI_LOAN_V2_FIXED,
          replayBlock: getNumEnv('NFTFI_LOAN_V2_FIXED_REPLAY_BLOCK', 0)
        },
        loanV2FixedCollection: {
          address: process.env.NFTFI_LOAN_V2_FIXED_COLLECTION,
          replayBlock: getNumEnv('NFTFI_LOAN_V2_FIXED_COLLECTION_REPLAY_BLOCK', 0)
        },
        loanV21Fixed: {
          address: process.env.NFTFI_LOAN_V21_FIXED,
          replayBlock: getNumEnv('NFTFI_LOAN_V21_FIXED_REPLAY_BLOCK', 0)
        },
        loanV23Fixed: {
          address: process.env.NFTFI_LOAN_V23_FIXED,
          replayBlock: getNumEnv('NFTFI_LOAN_V23_FIXED_REPLAY_BLOCK', 0)
        },
        loanV23FixedCollection: {
          address: process.env.NFTFI_LOAN_V23_FIXED_COLLECTION,
          replayBlock: getNumEnv('NFTFI_LOAN_V23_FIXED_COLLECTION_REPLAY_BLOCK', 0)
        },
        loanV23Refinance: {
          address: process.env.NFTFI_LOAN_V23_REFINANCE,
          replayBlock: getNumEnv('NFTFI_LOAN_V23_REFINANCE_REPLAY_BLOCK', 0)
        },
        loanV3Asset: {
          address: process.env.NFTFI_LOAN_V3_ASSET,
          replayBlock: getNumEnv('NFTFI_LOAN_V3_ASSET_REPLAY_BLOCK', 0)
        },
        loanV3Collection: {
          address: process.env.NFTFI_LOAN_V3_COLLECTION,
          replayBlock: getNumEnv('NFTFI_LOAN_V3_COLLECTION_REPLAY_BLOCK', 0)
        },
        loanV3Refinance: {
          address: process.env.NFTFI_LOAN_V3_REFINANCE,
          replayBlock: getNumEnv('NFTFI_LOAN_V3_REFINANCE_REPLAY_BLOCK', 0)
        },
        loanV31Refinance: {
          address: process.env.NFTFI_LOAN_V31_REFINANCE,
          replayBlock: getNumEnv('NFTFI_LOAN_V31_REFINANCE_REPLAY_BLOCK', 0)
        },
        coordinatorV2: { address: process.env.NFTFI_V2_COORDINATOR },
        coordinatorV23: { address: process.env.NFTFI_V23_COORDINATOR },
        coordinatorV3: { address: process.env.NFTFI_V3_COORDINATOR }
      },
      gondi: {
        loanV1: {
          address: process.env.GONDI_LOAN_V1,
          replayBlock: getNumEnv('GONDI_LOAN_V1_REPLAY_BLOCK', 0)
        },
        loanV2: {
          address: process.env.GONDI_LOAN_V2,
          replayBlock: getNumEnv('GONDI_LOAN_V2_REPLAY_BLOCK', 0)
        },
        loanV3: {
          address: process.env.GONDI_LOAN_V3,
          replayBlock: getNumEnv('GONDI_LOAN_V3_REPLAY_BLOCK', 0)
        },
        loanV31: {
          address: process.env.GONDI_LOAN_V31,
          replayBlock: getNumEnv('GONDI_LOAN_V31_REPLAY_BLOCK', 0)
        }
      }
    }
  },
  pagination: {
    limit: 20,
    page: 1
  },
  fxrate: {
    startDate: new Date('2020-01-01')
  },
  supportedCurrencies: new SupportedCurrencies({
    WETH: process.env.WETH_ADDRESS,
    DAI: process.env.DAI_ADDRESS,
    USDC: process.env.USDC_ADDRESS,
    USDC_AAVE: process.env.USDC_AAVE_ADDRESS,
    APE: process.env.APE_ADDRESS,
    GONDI_SAMPLE: process.env.GONDI_SAMPLE_ADDRESS
  }),
  nfts: {
    ignored: (process.env.NFT_LIST_IGNORED || '')
      .trim()
      .split(',')
      .map((str: string) => {
        const [address, tokenId] = str.split(':');
        return { address: address.toLowerCase(), tokenId };
      })
  }
};

export type Config = typeof config;

export default (): Config => config;
