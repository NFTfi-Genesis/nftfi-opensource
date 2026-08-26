import { Stack } from '@mui/material'
import { useCallback, useMemo } from 'react'
import { getTestId } from 'src/utils/testing'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { LoansMaturingEmptyState } from 'src/components/Tables/EmptyStates/LoansMaturingEmptyState'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { LoanMarketInfo } from 'src/entities/app/LoanMarketInfo'
import { Protocol } from 'src/entities/domain/Protocol'
import { useLoans } from 'src/services/hooks/loan/useLoans'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useActiveLoansColumns } from '../useActiveLoansColumns'
import { BorrowerLoansFilterTags } from './BorrowerLoansFilterTags'
import { BorrowerLoansFiltersForm } from './BorrowerLoansFiltersForm'
import { useBorrowerLoansTableState } from './useBorrowerLoansTableState'

export type ActiveLoansTableRow = LoanExtended<
  | NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  | LoanMarketInfo
>

export type BorrowerLoansTableProps = {
  onRowClick?: (row: ActiveLoansTableRow) => void
  selectedRow?: ActiveLoansTableRow | null
  onViewOffers?: (row: ActiveLoansTableRow) => void
}

export function BorrowerLoansTable({
  onRowClick,
  selectedRow,
  onViewOffers,
}: BorrowerLoansTableProps) {
  const { t } = useTranslation()

  const {
    tableState,
    handleChangeTableStateParams,
    sortingParams,
    paginationParams,
    handleSortChange,
    filters,
    updateFilter,
    filterStatus,
    clearAllFilters,
    hasUserSetFilters,
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  } = useBorrowerLoansTableState()

  const effectiveProtocols = useMemo<Protocol[] | undefined>(() => {
    if (filters.onlyNftfi) return [Protocol.Nftfi]
    return filters.protocol.length > 0 ? filters.protocol : undefined
  }, [filters.onlyNftfi, filters.protocol])

  const { data: loans, isLoading } = useLoans({
    filters: {
      borrower: filters.borrower,
      collectionIds: filters.collections.map(c => c.id),
      currency: filters.currency,
      dueWithin: filters.dueWithin,
      protocols: effectiveProtocols,
    },
    pagination: paginationParams,
    sort: sortingParams,
  })

  const { columns } = useActiveLoansColumns({ onViewOffers })

  const getRowId = useCallback((row: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>) => row.id.toString(), [])

  const toolbar = useCallback(
    () => <DropdownFiltersToolbar
      filtersForm={<BorrowerLoansFiltersForm filters={filters} updateFilter={updateFilter} />}
      filtersTags={<BorrowerLoansFilterTags filters={filters} updateFilter={updateFilter} filterStatus={filterStatus} />}
      showClear={filterStatus.hasActiveFilters}
      resetAllFilters={clearAllFilters}
      drawerType={DrawerType.DashboardFilters}
      drawerTitle={t('filters.filters')}
    />,
    [filters, updateFilter, filterStatus, clearAllFilters, t]
  )

  const emptyStateContent = useMemo(
    () => <LoansMaturingEmptyState clearAllFilters={clearAllFilters} showClearFilters={hasUserSetFilters} />,
    [clearAllFilters, hasUserSetFilters]
  )

  return (
    <Stack gap={3} width='100%' height='100%'>
      <TableServerPaginated<ActiveLoansTableRow>
        {...getTestId('borrow.loans')}
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
