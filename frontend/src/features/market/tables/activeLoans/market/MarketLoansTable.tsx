import { Stack } from '@mui/material'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { LoansMaturingEmptyState } from 'src/components/Tables/EmptyStates/LoansMaturingEmptyState'
import { Address } from 'src/entities/base/Address'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { LoanMarketInfo } from 'src/entities/app/LoanMarketInfo'
import { useLoans } from 'src/services/hooks/loan/useLoans'
import { getTestId } from 'src/utils/testing'
import { MarketToolbar } from '../../MarketToolbar'
import { useActiveLoansColumns } from '../useActiveLoansColumns'
import { useActiveLoansTableState } from './useMarketLoansTableState'

export type ActiveLoansTableRow = LoanExtended<
  | NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  | LoanMarketInfo
>

export type ActiveLoansTableProps = {
  onRowClick?: (row: ActiveLoansTableRow) => void
  selectedRow?: ActiveLoansTableRow | null
  onViewOffers?: (row: ActiveLoansTableRow) => void
}

export function ActiveLoansTable({
  onRowClick,
  selectedRow,
  onViewOffers,
}: ActiveLoansTableProps) {
  const { t } = useTranslation()

  // Table state
  const {
    tableState,
    handleChangeTableStateParams,
    sortingParams,
    paginationParams,
    handleSortChange,
    filters,
    hasUserSetFilters,
    handleChangeFilters,
    clearAllFilters,
    resetPageParam,
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  } = useActiveLoansTableState()

  // Data fetching
  const { data: loans, isLoading } = useLoans({
    filters: {
      protocols: filters.protocol,
      collectionIds: filters.collectionIds,
      currency: filters.currency,
      dueWithin: filters.dueWithin,
      wallets: filters.wallets,
    },
    pagination: paginationParams,
    sort: sortingParams,
  })

  const handleAddressClick = useCallback(
    (address: Address) => {
      const currentWallets = filters.wallets || []
      const newWallets = [...new Set([...currentWallets, address])]
      handleChangeFilters({ wallets: newWallets }, resetPageParam)
    },
    [filters.wallets, handleChangeFilters, resetPageParam]
  )

  // Columns
  const { columns } = useActiveLoansColumns({
    onAddressClick: handleAddressClick,
    onViewOffers,
  })

  const getRowId = useCallback((row: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>) => row.id.toString(), [])

  const toolbar = useCallback(
    () => <MarketToolbar resetPage={resetPageParam} filterKeys={['protocol', 'collectionIds', 'currency', 'dueWithin', 'wallets']} />,
    [resetPageParam]
  )

  const emptyStateContent = useMemo(
    () => <LoansMaturingEmptyState clearAllFilters={clearAllFilters} showClearFilters={hasUserSetFilters} />,
    [clearAllFilters, hasUserSetFilters]
  )

  return (
    <Stack gap={3} width='100%' height='100%'>
      <TableServerPaginated<ActiveLoansTableRow>
        {...getTestId('market.loans')}
        rows={loans?.data || []}
        getRowId={getRowId}
        columns={columns}
        title={t('dashboard.active-loans')}
        loading={isLoading}
        currentPage={tableState.page ?? 0}
        currentPageSize={tableState.pageSize ?? 25}
        totalDataCount={loans?.total || 0}
        onPaginationModelChange={handleChangeTableStateParams as (params: PaginationParams) => void}
        toolbar={toolbar}
        emptyState={emptyStateContent}
        sortingParams={sortingParams}
        onSortChange={handleSortChange as (field: string) => void}
        density={density}
        onDensityChange={setDensity}
        columnVisibilityModel={hiddenColumns}
        onColumnVisibilityModelChange={setHiddenColumns}
        onRowClick={params => onRowClick?.(params.row)}
        getRowClassName={params => (selectedRow && params.row.id === selectedRow.id)
          ? 'selected-row'
          : ''}
        hideColumnsWhenEmpty={true}
      />
    </Stack>
  )
}
