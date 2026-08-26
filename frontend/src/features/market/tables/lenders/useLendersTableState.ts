import { useMemo } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { SortOrder } from 'src/entities/app/SortParams'
import { LenderSortBy, LenderStats } from 'src/entities/app/LenderStats'
import { useMarketFilters } from '../useMarketFilters'
import { MarketTables, useMarketTableState } from '../useMarketTablesState'

export function useLendersTableState() {
  const [density, setDensity] = useLocalStorage(LocalStorageKeys.MarketTablesViewPreferences.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.MarketTablesViewPreferences.LendersHiddenColumns
  )

  const { pickFilters, clearAllFilters, handleChangeFilters } = useMarketFilters()

  const {
    tableState,
    handleChangeTableStateParams,
    resetPageParam,
    handleSortChange,
  } = useMarketTableState<LenderSortBy>(
    MarketTables.Lenders,
    {
      sortBy: LenderSortBy.totalUsdValue,
      sortOrder: SortOrder.DESC,
    },
    { page: 0, pageSize: TablePageSizes.Size25 }
  )

  const filters = useMemo(
    () => pickFilters(['protocol', 'collectionIds', 'currency', 'dueWithin']),
    [pickFilters]
  )

  const { lender } = useMemo(() => pickFilters(['lender']), [pickFilters])

  const sortingParams = useMemo(
    () => ({
      sortBy: tableState.sortBy,
      sortOrder: tableState.sortOrder,
    }),
    [tableState.sortBy, tableState.sortOrder]
  )

  const paginationParams = useMemo(
    () => ({
      page: tableState.page,
      pageSize: tableState.pageSize,
    }),
    [tableState]
  )

  const getIsRowSelected = (row: LenderStats) => row.lenderAddress === lender

  return {
    // pagination & sorting
    tableState,
    handleChangeTableStateParams,
    sortingParams,
    paginationParams,
    handleSortChange,

    // filters
    filters,
    lender,
    handleChangeFilters,
    clearAllFilters,
    resetPageParam,

    // view prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,

    // helpers
    getIsRowSelected,
  }
}
