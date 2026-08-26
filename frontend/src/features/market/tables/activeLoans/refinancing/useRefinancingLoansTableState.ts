import { useCallback, useMemo } from 'react'
import { Address } from 'src/entities/base/Address'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { SortOrder } from 'src/entities/app/SortParams'
import { LoansSortBy } from 'src/entities/domain/Loan'
import { DueWithin } from 'src/utils/dueWithin'
import { Currency } from 'src/entities/domain/Currency'
import { Protocol } from 'src/entities/domain/Protocol'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { useWallet } from 'src/modules/wallet/useWallet'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { PanicError } from 'src/errors/PanicError'
import { MarketTables, useMarketTableState } from '../../useMarketTablesState'

export type RefinancingLoansFilters = {
  protocol: Protocol[]
  collections: CollectionExtended<CollectionInfo>[]
  currency: Currency[]
  dueWithin: DueWithin | null
  wallets: Address[]
}

export type RefinancingLoansFiltersStatus = {
  hasActiveFilters: boolean
  hasCollection: boolean
  hasProtocol: boolean
  hasCurrency: boolean
  hasDueWithin: boolean
  hasWallets: boolean
}

export type UpdateRefinancingLoansFilter = <K extends keyof RefinancingLoansFilters>(
  key: K,
  value: RefinancingLoansFilters[K]
) => void

export const refiSupportedProtocols: Protocol[] = [Protocol.Nftfi, Protocol.Gondi]

const defaultFilters: RefinancingLoansFilters = {
  protocol: [],
  collections: [],
  currency: [],
  dueWithin: null,
  wallets: [] as Address[],
}

export function useRefinancingLoansTableState() {
  const { walletAddress } = useWallet()

  if (!walletAddress) {
    throw new PanicError({
      message: 'Refinancing my loans table requires a connected wallet',
    })
  }

  const [density, setDensity] = useLocalStorage(LocalStorageKeys.RefinancingLoansTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.RefinancingLoansTable.HiddenColumns
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

  const [filters, setFilters] = useLocalStorage(LocalStorageKeys.RefinancingLoansTable.Filters)

  const clearAllFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      wallets: [walletAddress],
    })
  }, [setFilters, walletAddress])

  const updateFilter = useCallback<UpdateRefinancingLoansFilter>((key, value) => {
    setFilters((prev: RefinancingLoansFilters) => {
      if (key === 'wallets') {
        const wallets = value as Address[]
        const walletsWithUser = wallets.includes(walletAddress)
          ? wallets
          : [...wallets, walletAddress]
        return { ...prev, wallets: walletsWithUser }
      }
      return { ...prev, [key]: value }
    })
  }, [setFilters, walletAddress])

  const effectiveProtocols = useMemo(() => {
    const userProtocols = filters?.protocol || []
    const supportedProtocols = userProtocols.filter(protocol => refiSupportedProtocols.includes(protocol))
    return supportedProtocols.length > 0
      ? supportedProtocols
      : refiSupportedProtocols
  }, [filters?.protocol])

  const effectiveFilters = useMemo(() => {
    // Ensure walletAddress is always included in the wallets filter
    const wallets = filters?.wallets || []
    const walletsWithUser = !wallets.includes(walletAddress)
      ? [...wallets, walletAddress]
      : wallets

    return {
      ...filters,
      protocol: effectiveProtocols,
      wallets: walletsWithUser,
    }
  }, [filters, effectiveProtocols, walletAddress])

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

  const isProtocolFilterActive = effectiveFilters?.protocol?.length > 0
    && effectiveFilters.protocol.length !== refiSupportedProtocols.length

  const isWalletsFilterActive = effectiveFilters?.wallets?.length > 1

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
      hasCollection: effectiveFilters?.collections?.length > 0,
      hasProtocol: effectiveFilters?.protocol?.length > 0,
      hasCurrency: effectiveFilters?.currency?.length > 0,
      hasDueWithin: effectiveFilters?.dueWithin !== null,
      hasWallets: effectiveFilters?.wallets?.length > 0,
      hasActiveFilters: effectiveFilters?.collections?.length > 0
        || isProtocolFilterActive
        || effectiveFilters?.currency?.length > 0
        || effectiveFilters?.dueWithin !== null
        || isWalletsFilterActive,
    },
    clearAllFilters,

    // view prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}
