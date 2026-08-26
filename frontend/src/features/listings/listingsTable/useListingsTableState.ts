import { useCallback, useMemo, useState } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { SortParams, SortOrder } from 'src/entities/app/SortParams'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { ListingsSortBy, ListingsFilters } from 'src/services/fetchers/listing/getListings'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'

export type UpdateListingsFilter = <K extends keyof ListingsFilters>(
  key: K,
  value: ListingsFilters[K]
) => void

export type ListingsFiltersStatus = {
  hasBorrower: boolean
  hasCurrency: boolean
  hasCollections: boolean
  hasDuration: boolean
  hasActiveFilters: boolean
}

export const listingsDefaultFilters: ListingsFilters = {
  collections: [],
  borrower: null,
  currency: null,
  duration: null,
}

export function useListingsTableState() {
  // Pagination
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(TablePageSizes.Size25)

  // Sorting (server-side)
  const [sortingParams, setSortingParams] = useState<SortParams<ListingsSortBy>>({
    sortBy: ListingsSortBy.listedDate,
    sortOrder: SortOrder.DESC,
  })

  const [density, setDensity] = useLocalStorage(LocalStorageKeys.ListingsTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.ListingsTable.HiddenColumns
  )

  const handleSortChange = useCallback((field: ListingsSortBy) => {
    setSortingParams(prev => ({
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === SortOrder.ASC
          ? SortOrder.DESC
          : SortOrder.ASC,
    }))
    setPage(0)
  }, [])

  const [filters, setFilters] = useLocalStorage(LocalStorageKeys.ListingsTable.Filters)

  const updateFilter = useCallback<UpdateListingsFilter>((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }, [setFilters])

  const resetAllFilters = useCallback(() => {
    setFilters(listingsDefaultFilters)
    setPage(0)
  }, [setFilters])

  const filterStatus = useMemo<ListingsFiltersStatus>(() => {
    const hasBorrower = filters.borrower !== null
    const hasCurrency = filters.currency !== null
    const hasCollections = filters.collections.length > 0
    const hasDuration = filters.duration !== null

    return {
      hasCollections,
      hasBorrower,
      hasCurrency,
      hasDuration,
      hasActiveFilters: hasBorrower || hasCurrency || hasCollections || hasDuration,
    }
  }, [filters])

  return {
    // pagination
    page,
    setPage,
    pageSize,
    setPageSize,

    // sorting
    sortingParams,
    setSortingParams,
    handleSortChange,

    // filters
    filters,
    filtersDefaults: listingsDefaultFilters,
    updateFilter,
    resetAllFilters,
    filterStatus,

    // view prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
