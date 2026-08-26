import { useCallback, useMemo, useState } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { SortOrder, SortParams } from 'src/entities/app/SortParams'
import { LoansSortBy, LoanStatus } from 'src/entities/domain/Loan'
import { HistoricalLoansSide } from './useHistoricalLoansColumns'

export const HISTORICAL_LOAN_STATUSES: LoanStatus[] = [
  LoanStatus.Repaid,
  LoanStatus.Liquidated,
  LoanStatus.Defaulted,
]

export type HistoricalLoansFilters = {
  statuses: LoanStatus[]
}

export type UpdateHistoricalLoansFilter = <K extends keyof HistoricalLoansFilters>(
  key: K,
  value: HistoricalLoansFilters[K]
) => void

export function useHistoricalLoansTableState(side: HistoricalLoansSide) {
  const storageKeys = side === 'borrower'
    ? LocalStorageKeys.HistoricalBorrowerLoansTable
    : LocalStorageKeys.HistoricalLenderLoansTable
  const [density, setDensity] = useLocalStorage(storageKeys.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(storageKeys.HiddenColumns)
  const [filters, setFilters] = useLocalStorage(storageKeys.Filters)

  // The history page is a personal, wallet-scoped view — its sort/pagination don't belong in the
  // URL (unlike the shareable market tables). Keep them in local component state.
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(TablePageSizes.Size25)
  const [sortingParams, setSortingParams] = useState<SortParams<LoansSortBy>>({
    sortBy: LoansSortBy.dueTime,
    sortOrder: SortOrder.DESC,
  })

  const handleSortChange = useCallback((field: LoansSortBy) => {
    setSortingParams(prev => prev.sortBy === field
      ? { sortBy: field, sortOrder: prev.sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC }
      : { sortBy: field, sortOrder: SortOrder.ASC })
    // Sorting changes the result set ordering — go back to the first page.
    setPage(0)
  }, [])

  const updateFilter = useCallback<UpdateHistoricalLoansFilter>((key, value) => {
    setFilters((prev: HistoricalLoansFilters) => ({ ...prev, [key]: value }))
  }, [setFilters])

  const clearAllFilters = useCallback(() => {
    setFilters({ statuses: [] })
  }, [setFilters])

  // Empty selection means "show all historical statuses".
  const effectiveStatuses = useMemo<LoanStatus[]>(
    () => filters.statuses.length > 0 ? filters.statuses : HISTORICAL_LOAN_STATUSES,
    [filters.statuses]
  )

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    sortingParams,
    handleSortChange,

    filters,
    updateFilter,
    effectiveStatuses,
    filterStatus: {
      hasStatuses: filters.statuses.length > 0,
      hasActiveFilters: filters.statuses.length > 0,
    },
    clearAllFilters,

    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
