import { useCallback, useState } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { Amount } from 'src/entities/base/Amount'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { SortOrder, SortParams } from 'src/entities/app/SortParams'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { CollectionMarketInfo } from 'src/entities/app/CollectionMarketInfo'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'

export type CollectionsTableRow = CollectionExtended<CollectionInfo | CollectionStats | CollectionMarketInfo>

export type UpdateCollectionsFilter = <K extends keyof CollectionsFilters>(
  key: K,
  value: CollectionsFilters[K]
) => void

export type CollectionsFiltersStatus = {
  hasCollection: boolean
  hasActiveFilters: boolean
}

export type CollectionsFilters = {
  collections: CollectionExtended<CollectionInfo>[]
  avgLoanAmount: {
    min: Amount | null
    max: Amount | null
  }
  totalLoanAmount: {
    min: Amount | null
    max: Amount | null
  }
}
const defaultFilters: CollectionsFilters = {
  collections: [],
  avgLoanAmount: {
    min: null,
    max: null,
  },
  totalLoanAmount: {
    min: null,
    max: null,
  },
}

export function useCollectionsTableState() {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(TablePageSizes.Size25)
  const [sort, setSort] = useState<SortParams>({
    sortBy: 'avgLoanAmount',
    sortOrder: SortOrder.DESC,
  })

  const [density, setDensity] = useLocalStorage(LocalStorageKeys.CollectionsTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.CollectionsTable.HiddenColumns
  )

  const [filters, setFilters] = useLocalStorage(LocalStorageKeys.CollectionsTable.Filters)

  const resetAllFilters = useCallback(() => {
    setFilters(defaultFilters)
    setPage(0)
  }, [setFilters])

  const updateFilter = useCallback<UpdateCollectionsFilter>((key, value) => {
    setFilters((prev: CollectionsFilters) => ({ ...prev, [key]: value }))
    setPage(0)
  }, [setFilters])

  const updateSort = useCallback((field: string) => {
    setSort(prev => ({
      sortBy: field, sortOrder: prev.sortBy === field && prev.sortOrder === SortOrder.ASC
        ? SortOrder.DESC
        : SortOrder.ASC
    }))
  }, [])

  return {
    // Pagination
    page,
    pageSize,
    setPage,
    setPageSize,
    // Filters
    filters,
    defaultFilters,
    resetAllFilters,
    updateFilter,
    filterStatus: {
      hasCollection: filters.collections.length > 0,
      hasActiveFilters: filters.collections.length > 0
        || filters.avgLoanAmount.min !== null
        || filters.avgLoanAmount.max !== null
        || filters.totalLoanAmount.min !== null
        || filters.totalLoanAmount.max !== null,
    },
    // Sorting
    sort,
    updateSort,
    // View prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
