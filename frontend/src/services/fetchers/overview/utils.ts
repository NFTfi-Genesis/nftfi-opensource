import { Address } from 'src/entities/base/Address'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { SortOrder, SortParams } from 'src/entities/app/SortParams'
import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { getCurrencyAddress } from 'src/utils/currencies'
import { ProtocolApiKeys } from 'src/utils/protocols'

type SerializeAnalyticsParamsInput<TSortBy extends string = string> = {
  filters?: MarketFilters
  pagination?: PaginationParams
  sort?: SortParams<TSortBy>
  sortByMap?: Partial<Record<TSortBy, string>>
}

export function serializeAnalyticsParams<TSortBy extends string = string>({
  filters,
  pagination,
  sort,
  sortByMap,
}: SerializeAnalyticsParamsInput<TSortBy>) {
  const qs = new URLSearchParams()

  if (filters?.protocol?.length) {
    qs.set('protocols', filters.protocol.map(protocol => ProtocolApiKeys[protocol]).join(','))
  }

  if (filters?.currency?.length) {
    qs.set('currencies', filters.currency.map(currency => getCurrencyAddress(currency).toLowerCase()).join(','))
  }

  if (filters?.collectionIds?.length) {
    qs.set('collectionIds', filters.collectionIds.join(','))
  }

  if (filters?.dueWithin) {
    qs.set('daysFromNow', filters.dueWithin.toString())
  }

  if (filters?.wallets?.length) {
    qs.set('wallets', filters.wallets.join(','))
  }

  if (filters?.lender) {
    qs.set('lender', filters.lender)
  }

  if (filters?.borrower) {
    qs.set('borrower', filters.borrower)
  }

  if (pagination) {
    qs.set('page', (pagination.page + 1).toString())
    qs.set('limit', pagination.pageSize.toString())
  }

  if (sort?.sortBy) {
    qs.set('sortBy', sortByMap?.[sort.sortBy] ?? sort.sortBy)
  }

  if (sort?.sortOrder) {
    qs.set('sortDirection', sort.sortOrder === SortOrder.ASC
      ? 'asc'
      : 'desc')
  }

  return qs.toString()
}

export function getPaginationTotal(headers: Headers, fallback: number) {
  const total = Number(headers.get('x-pagination-total'))
  return Number.isFinite(total)
    ? total
    : fallback
}

export function normalizeAddress(address: string): Address {
  return address.toLowerCase() as Address
}
