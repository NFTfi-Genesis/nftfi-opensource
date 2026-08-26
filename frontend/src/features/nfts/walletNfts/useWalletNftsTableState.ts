import { useState, useMemo, useCallback } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { SortParams, SortOrder } from 'src/entities/app/SortParams'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { WalletNftsTableRow } from './WalletNftsTable'
import {
  WalletNftsFilters,
  WalletNftsStatusOptions,
  UpdateWalletNftsFilter,
  WalletNftsFiltersStatus,
} from './types'

const defaultFilters: WalletNftsFilters = {
  collection: [],
  status: WalletNftsStatusOptions.Any,
}

export function useWalletNftsTableState(rows: WalletNftsTableRow[] | undefined) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(TablePageSizes.Size25)
  const [sortingParams, setSortingParams] = useState<SortParams>({
    sortBy: 'avgApr',
    sortOrder: SortOrder.ASC,
  })
  const [filters, setFilters] = useLocalStorage(LocalStorageKeys.WalletNftsTable.Filters)

  const [density, setDensity] = useLocalStorage(LocalStorageKeys.WalletNftsTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.WalletNftsTable.HiddenColumns
  )

  const updateFilter = useCallback<UpdateWalletNftsFilter>((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }, [setFilters])

  const resetAllFilters = useCallback(() => {
    setFilters(defaultFilters)
    setPage(0)
  }, [setFilters])

  const handleSortChange = useCallback((field: string) => {
    setSortingParams(prev => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === SortOrder.ASC
        ? SortOrder.DESC
        : SortOrder.ASC,
    }))
  }, [])

  // Filter status
  const hasCollection = filters.collection.length > 0
  const hasStatus = filters.status !== defaultFilters.status

  const filterStatus = useMemo<WalletNftsFiltersStatus>(
    () => ({
      hasCollection,
      hasStatus,
      hasActiveFilters: hasCollection || hasStatus,
    }),
    [hasCollection, hasStatus]
  )

  // Filtered data
  const filteredData = useMemo(() => {
    if (!rows || rows.length === 0) return []

    return rows.filter(row => {
      if (filters.collection.length > 0) {
        if (!filters.collection.includes(row.collection.info.name)) {
          return false
        }
      }

      if (filters.status !== WalletNftsStatusOptions.Any) {
        const matchesStatus
          = (filters.status === WalletNftsStatusOptions.Listed && row.listing)
          || (filters.status === WalletNftsStatusOptions.Unlisted && !row.listing)
        if (!matchesStatus) return false
      }

      return true
    })
  }, [rows, filters])

  // Sorted data
  const processedData = useMemo(() => {
    if (!filteredData.length) return []

    const sorted = [...filteredData].sort((a, b) => {
      const { sortBy, sortOrder } = sortingParams
      let aValue: number | bigint
      let bValue: number | bigint

      switch (sortBy) {
        case 'avgLoanAmount':
          aValue = a.collection.stats.avgLoanAmount
          bValue = b.collection.stats.avgLoanAmount
          break
        case 'avgApr':
          aValue = a.collection.stats.avgApr
          bValue = b.collection.stats.avgApr
          break
        case 'loanOffersCount':
          aValue = a.collection.stats.loanCount
          bValue = b.collection.stats.loanCount
          break
        case 'listed':
          aValue = a.listing
            ? 1
            : 0
          bValue = b.listing
            ? 1
            : 0
          break
        default:
          return 0
      }

      // Handle bigint comparison
      if (typeof aValue === 'bigint' && typeof bValue === 'bigint') {
        const comparison = aValue < bValue
          ? -1
          : aValue > bValue
            ? 1
            : 0
        return sortOrder === SortOrder.ASC
          ? comparison
          : -comparison
      }

      // Handle number comparison
      const comparison = (aValue as number) - (bValue as number)
      return sortOrder === SortOrder.ASC
        ? comparison
        : -comparison
    })

    return sorted
  }, [filteredData, sortingParams])

  return {
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,

    // Sorting
    sortingParams,
    setSortingParams,
    handleSortChange,

    // Filters
    filters,
    filtersDefaults: defaultFilters,
    updateFilter,
    resetAllFilters,
    filterStatus,

    // Processed data
    processedData,

    // View prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
