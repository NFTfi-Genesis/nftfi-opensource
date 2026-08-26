import { useCallback, useMemo } from 'react'
import { Address } from 'src/entities/base/Address'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { useWallet } from 'src/modules/wallet/useWallet'
import { SortOrder } from 'src/entities/app/SortParams'
import { LoansSortBy } from 'src/entities/domain/Loan'
import { DueWithin } from 'src/utils/dueWithin'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Currency } from 'src/entities/domain/Currency'
import { Protocol } from 'src/entities/domain/Protocol'
import { PanicError } from 'src/errors/PanicError'
import { hasAnyValue } from 'src/utils/objects'
import { MarketTables, useMarketTableState } from '../../useMarketTablesState'

export type BorrowerLoansFilters = {
  onlyNftfi: boolean
  protocol: Protocol[]
  collections: CollectionExtended<CollectionInfo>[]
  currency: Currency[]
  dueWithin: DueWithin | null
  borrower: Address
}

export type BorrowerLoansFiltersStatus = {
  hasActiveFilters: boolean
  hasOnlyNftfi: boolean
  hasCollection: boolean
  hasProtocol: boolean
  hasCurrency: boolean
  hasDueWithin: boolean
}

export type UpdateBorrowerLoansFilter = <K extends keyof BorrowerLoansFilters>(
  key: K,
  value: BorrowerLoansFilters[K]
) => void

const defaultFilters: Omit<BorrowerLoansFilters, 'borrower'> = {
  onlyNftfi: false,
  protocol: [],
  collections: [],
  currency: [],
  dueWithin: null,
}

export function useBorrowerLoansTableState() {
  const { walletAddress } = useWallet()

  if (!walletAddress) {
    throw new PanicError({
      message: 'Wallet must be connected to view user borrower loans',
      details: { context: 'useBorrowerLoansTableState' },
    })
  }

  const [density, setDensity] = useLocalStorage(LocalStorageKeys.BorrowerLoansTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.BorrowerLoansTable.HiddenColumns
  )
  const {
    tableState,
    handleChangeTableStateParams,
    handleSortChange,
  } = useMarketTableState<LoansSortBy>(
    MarketTables.Loans,
    {
      sortBy: LoansSortBy.secondsUntilDue,
      sortOrder: SortOrder.ASC,
    },
    { page: 0, pageSize: TablePageSizes.Size25 }
  )

  const [filters, setFilters] = useLocalStorage(LocalStorageKeys.BorrowerLoansTable.Filters)

  const clearAllFilters = useCallback(() => {
    setFilters({ ...defaultFilters, borrower: walletAddress })
  }, [setFilters, walletAddress])

  const updateFilter = useCallback<UpdateBorrowerLoansFilter>((key, value) => {
    setFilters((prev: BorrowerLoansFilters) => {
      // Toggling onlyNftfi resets collections and protocol since their semantics change.
      if (key === 'onlyNftfi') {
        return { ...prev, onlyNftfi: value as boolean, collections: [], protocol: [] }
      }
      return { ...prev, [key]: value }
    })
  }, [setFilters])

  const effectiveFilters = useMemo(
    () => ({ ...filters, borrower: walletAddress }),
    [filters, walletAddress]
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
    filters: effectiveFilters,
    updateFilter,
    filterStatus: {
      hasOnlyNftfi: effectiveFilters.onlyNftfi,
      hasCollection: effectiveFilters.collections.length > 0,
      hasProtocol: effectiveFilters.protocol.length > 0,
      hasCurrency: effectiveFilters.currency.length > 0,
      hasDueWithin: effectiveFilters.dueWithin !== null,
      hasActiveFilters: effectiveFilters.onlyNftfi
        || effectiveFilters.collections.length > 0
        || effectiveFilters.protocol.length > 0
        || effectiveFilters.currency.length > 0
        || effectiveFilters.dueWithin !== null,
    },
    hasUserSetFilters: hasAnyValue(filters),
    clearAllFilters,

    // view prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
