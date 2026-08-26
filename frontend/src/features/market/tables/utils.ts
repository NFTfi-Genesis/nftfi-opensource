import { CurrencyTicker } from 'src/utils/currencies'
import { ProtocolApiKeys } from 'src/utils/protocols'
import { SortParams } from 'src/entities/app/SortParams'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { MarketFilters } from './useMarketFilters'

/*
  TODO: Refactor these utility functions. The goal is to separate the logic of mapping dashboard state (filters, sort, pagination) to API query parameter objects from the logic of serializing these objects into a query string:
    1. Create `map<Type>ToQsObject(state: <Type>): Record<string, string | undefined>` functions (e.g., mapDashboardFiltersToQsObject). These will take dashboard state (like DashboardFilters) and return a plain object where keys are API query parameter names and values are their string values.
    2. Create a generic `serializeQsObjectToString(params: Record<string, string | undefined>): string` function that takes one of these objects and converts it into a URL query string.
    3. Update API hook callers (e.g., in src/apiServices/tinyBirdApi/) to:
      a. Call the new `map<Type>ToQsObject` functions.
      b. Merge the resulting parameter objects if multiple are needed for an endpoint.
      c. Pass the merged object to `serializeQsObjectToString` to get the final query string.
*/

export function serializeDashboardFilters(filters: MarketFilters & { collections?: CollectionExtended<CollectionInfo>[] }) {
  const qs = new URLSearchParams()
  if (filters.protocol?.length) {
    qs.set(
      'protocolNames',
      filters.protocol.map(p => ProtocolApiKeys[p]).join(',')
    )
  }
  if (filters.collections?.length) {
    qs.set('nftProjectNames', filters.collections.map(c => c.info.name).join(','))
  }
  if (filters.currency?.length) {
    qs.set(
      'currencyNames',
      filters.currency.map(c => CurrencyTicker[c]).join(',')
    )
  }
  if (filters.dueWithin) {
    qs.set('daysFromNow', filters.dueWithin.toString())
  }
  if (filters.wallets?.length) {
    qs.set('wallets', filters.wallets.join(','))
  }
  if (filters.lender) {
    qs.set('lenderAddress', filters.lender)
  }
  if (filters.borrower) {
    qs.set('borrowerAddress', filters.borrower)
  }
  return qs.toString()
}

export function serializeDashboardSort(
  sortParams: SortParams,
  tableKey?: string
) {
  const qs = new URLSearchParams()
  const sortByParamName = tableKey
    ? `${tableKey}SortBy`
    : 'sort_by'
  const sortOrderParamName = tableKey
    ? `${tableKey}SortOrder`
    : 'sort_order'

  if (sortParams.sortBy) {
    qs.set(sortByParamName, sortParams.sortBy)
  }
  if (sortParams.sortOrder) {
    qs.set(sortOrderParamName, sortParams.sortOrder)
  }
  return qs.toString()
}

export function serializeDashboardPagination(
  paginationParams: PaginationParams,
  tableKey?: string
) {
  const qs = new URLSearchParams()
  const pageParamName = tableKey
    ? `${tableKey}Page`
    : 'page'
  const pageSizeParamName = tableKey
    ? `${tableKey}PageSize`
    : 'page_size'

  if (paginationParams.page !== undefined) {
    qs.set(pageParamName, paginationParams.page.toString())
  }
  if (paginationParams.pageSize !== undefined) {
    qs.set(pageSizeParamName, paginationParams.pageSize.toString())
  }
  return qs.toString()
}

type SerializeDashboardParamsInput = {
  filters?: MarketFilters
  pagination?: PaginationParams
  sort?: SortParams
}

export function serializeDashboardParams(params: SerializeDashboardParamsInput) {
  const parts: string[] = []

  if (params.filters) {
    const filtersString = serializeDashboardFilters(params.filters)
    if (filtersString) {
      parts.push(filtersString)
    }
  }

  if (params.pagination) {
    const paginationString = serializeDashboardPagination(params.pagination)
    if (paginationString) {
      parts.push(paginationString)
    }
  }

  if (params.sort) {
    const sortString = serializeDashboardSort(params.sort)
    if (sortString) {
      parts.push(sortString)
    }
  }

  return parts.join('&')
}
