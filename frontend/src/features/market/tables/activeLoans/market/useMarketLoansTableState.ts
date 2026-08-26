import { useMemo } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { SortOrder } from 'src/entities/app/SortParams'
import { LoansSortBy } from 'src/entities/domain/Loan'
import { hasAnyValue } from 'src/utils/objects'
import { useMarketFilters } from '../../useMarketFilters'
import { MarketTables, useMarketTableState } from '../../useMarketTablesState'

export function useActiveLoansTableState() {
  const [density, setDensity] = useLocalStorage(LocalStorageKeys.MarketTablesViewPreferences.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.MarketTablesViewPreferences.ActiveLoansHiddenColumns
  )
  const {
    tableState,
    handleChangeTableStateParams,
    resetPageParam,
    handleSortChange,
  } = useMarketTableState<LoansSortBy>(
    MarketTables.Loans,
    {
      sortBy: LoansSortBy.secondsUntilDue,
      sortOrder: SortOrder.ASC,
    },
    { page: 0, pageSize: TablePageSizes.Size25 }
  )
  const { pickFilters, clearAllFilters, handleChangeFilters } = useMarketFilters()

  const filters = useMemo(
    () => pickFilters(['protocol', 'collectionIds', 'currency', 'dueWithin', 'wallets']),
    [pickFilters]
  )

  const sortingParams = useMemo(
    () => ({
      sortBy: tableState.sortBy,
      sortOrder: tableState.sortOrder,
    }),
    [tableState]
  )

  const paginationParams = useMemo(
    () => ({
      page: tableState.page,
      pageSize: tableState.pageSize,
    }),
    [tableState]
  )

  return {
    // pagination & sorting
    tableState,
    handleChangeTableStateParams,
    sortingParams,
    paginationParams,
    handleSortChange,

    // filters
    filters,
    hasUserSetFilters: hasAnyValue(filters),
    handleChangeFilters,
    clearAllFilters,
    resetPageParam,

    // view prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
