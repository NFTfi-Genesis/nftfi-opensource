/// <reference types="vite/types/importMeta.d.ts" />

// This file is required to be isomorphic, meaning it must be usable for both build-time validation and runtime type safety.

import { z } from 'zod'
import { contracts, contractsSchema } from './contracts'
import { testNftsSchema } from './testNfts'
import { zAddress } from './utils'

const configSchema = z.object({
  dynamicEnvironmentId: z.string(),
  featureFlags: z.object({
    showDashboard: z.boolean(),
    showDataTestIds: z.boolean(),
  }),
  ethereum: z.object({
    chainId: z.number(),
    fallbackRpcUrl: z.string().url(),
    contracts: contractsSchema,
  }),
  apiServices: z.object({
    tbApiHost: z.string().url(),
    proxyUrl: z.string().url(),
    alchemyApiUrl: z.string().url(),
    suffixEndpoint: z.string(),
    nftfiApiUrl: z.string().url(),
    nftfiSdkApiUrl: z.string().url(),
    nftfiSdkApiKey: z.string(),
    reservoirApiUrl: z.string().url(),
  }),
  activateMsw: z.boolean(),
  version: z.object({
    shortSha: z.string().optional(),
    tagName: z.string().optional(),
  }),
  googleAnalyticsId: z.string().optional(),
  showStaleDashboardDataAlert: z.boolean(),
  showDashboardMaintenanceAlert: z.boolean(),
  urls: z.object({
    termsOfService: z.string().url(),
    termsOfUse: z.string().url(),
  }),
  test: z.object({
    nfts: testNftsSchema.optional(),
    impersonatedWallet: zAddress().optional(),
    impersonatedWalletsMap: z.record(zAddress(), zAddress()).optional(),
  }),
})

export const ConfigError = z.ZodError<Config>
export type Config = z.infer<typeof configSchema>

export function buildConfig(env: Record<string, string | undefined>): Config | typeof ConfigError {
  const config = {
    dynamicEnvironmentId: env.VITE_DYNAMIC_KEY,
    featureFlags: {
      showDashboard: env.VITE_FEATURE_FLAG_SHOW_DASHBOARD === 'true',
      showDataTestIds: env.VITE_SHOW_DATA_TEST_IDS === 'true',
    },
    ethereum: {
      chainId: 1,
      fallbackRpcUrl: z.string().url().safeParse(env.VITE_FALLBACK_RPC_URL).success
        ? env.VITE_FALLBACK_RPC_URL
        : `${env.VITE_PROXY_URL}/alchemy`,
      contracts: contracts,
    },
    apiServices: {
      tbApiHost: env.VITE_DASHBOARD_API_HOST,
      proxyUrl: env.VITE_PROXY_URL,
      alchemyApiUrl: `${env.VITE_PROXY_URL}/alchemy`,
      suffixEndpoint: '_endpoint',
      nftfiApiUrl: env.VITE_NFTFI_API_URL,
      nftfiSdkApiUrl: env.VITE_NFTFI_SDK_API_URL,
      nftfiSdkApiKey: env.VITE_NFTFI_SDK_API_KEY,
      reservoirApiUrl: `${env.VITE_PROXY_URL}/reservoir`,
    },
    activateMsw: env.VITE_ACTIVATE_MSW === 'true',
    version: {
      shortSha: env.VITE_SHORT_SHA,
      tagName: env.VITE_TAG_NAME,
    },
    googleAnalyticsId: env.VITE_GOOGLE_ANALYTICS_ID,
    showStaleDashboardDataAlert: false,
    showDashboardMaintenanceAlert: false,
    urls: {
      termsOfService: env.VITE_TERMS_OF_SERVICE_URL || 'https://nftfi.com/terms-and-conditions/',
      termsOfUse: env.VITE_TERMS_OF_USE_URL || 'https://nftfi.com/terms-of-use/',
    },
    test: {
      nfts: env.VITE_TEST_NFTS
        ? JSON.parse(env.VITE_TEST_NFTS)
        : undefined,
      impersonatedWallet: env.VITE_IMPERSONATED_WALLET,
      impersonatedWalletsMap: env.VITE_IMPERSONATED_WALLETS_MAP
        ? JSON.parse(env.VITE_IMPERSONATED_WALLETS_MAP)
        : undefined,
    },
  }
  try {
    return configSchema.parse(config)
  } catch (error) {
    return error as typeof ConfigError
  }
}
