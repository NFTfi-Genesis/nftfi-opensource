export enum WalletNftsStatusOptions {
  Any = 'Any',
  Listed = 'Listed',
  Unlisted = 'Unlisted',
}

export type WalletNftsFilters = {
  collection: string[]
  status: WalletNftsStatusOptions
}

export type UpdateWalletNftsFilter = <K extends keyof WalletNftsFilters>(
  key: K,
  value: WalletNftsFilters[K]
) => void

export type WalletNftsFiltersStatus = {
  hasCollection: boolean
  hasStatus: boolean
  hasActiveFilters: boolean
}
