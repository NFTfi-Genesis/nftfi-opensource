import { Stack } from '@mui/material'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { LoanMarketInfo } from 'src/entities/app/LoanMarketInfo'
import { useLoans } from 'src/services/hooks/loan/useLoans'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { getTestId } from 'src/utils/testing'
import { BaseEmptyState } from 'src/components/Tables/EmptyStates/BaseEmptyState'
import { useActiveLoansColumns } from '../useActiveLoansColumns'
import { RefinancingLoansFilterTags } from './RefinancingLoansFilterTags'
import { RefinancingLoansFiltersForm } from './RefinancingLoansFiltersForm'
import { useRefinancingLoansTableState } from './useRefinancingLoansTableState'

export type ActiveLoansTableRow = LoanExtended<
  | NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  | LoanMarketInfo
>

export type RefinancingLoansTableProps = {
  onRowClick?: (row: ActiveLoansTableRow) => void
  selectedRow?: ActiveLoansTableRow | null
  onViewOffers?: (row: ActiveLoansTableRow) => void
}

export function RefinancingLoansTable({
  onRowClick,
  selectedRow,
  onViewOffers,
}: RefinancingLoansTableProps) {
  const { t } = useTranslation()

  // Table state
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
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  } = useRefinancingLoansTableState()

  // Data fetching
  const { data: loans, isLoading } = useLoans({
    filters: {
      protocols: filters.protocol,
      collectionIds: filters.collections.map(c => c.id),
      currency: filters.currency,
      dueWithin: filters.dueWithin,
      wallets: filters.wallets,
    },
    pagination: paginationParams,
    sort: sortingParams,
  })

  // Columns
  const { columns } = useActiveLoansColumns({
    onViewOffers,
  })

  const getRowId = useCallback((row: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>) => row.id.toString(), [])

  const toolbar = useCallback(
    () => <DropdownFiltersToolbar
      filtersForm={<RefinancingLoansFiltersForm filters={filters} updateFilter={updateFilter} />}
      filtersTags={<RefinancingLoansFilterTags filters={filters} updateFilter={updateFilter} filterStatus={filterStatus} />}
      showClear={filterStatus.hasActiveFilters}
      resetAllFilters={clearAllFilters}
      drawerType={DrawerType.DashboardFilters}
      drawerTitle={t('filters.filters')}
    />,
    [filters, updateFilter, filterStatus, clearAllFilters, t]
  )

  const emptyStateContent = useMemo(
    () => {
      const descriptionKey = filterStatus.hasActiveFilters
        ? 'dashboard.adjust-or-clear-filters'
        : 'dashboard.no-loans-found-description'
      return <BaseEmptyState title={t('dashboard.no-loans-found')} description={t(descriptionKey)} ctaAction={clearAllFilters} showClearFilters={filterStatus.hasActiveFilters} />
    },
    [clearAllFilters, filterStatus.hasActiveFilters, t]
  )

  return (
    <Stack gap={3} width='100%' height='100%'>
      <TableServerPaginated<ActiveLoansTableRow>
        {...getTestId('lend.loans')}
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
