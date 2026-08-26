import { useCallback, useMemo } from 'react'
import { getTestId } from 'src/utils/testing'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { BaseEmptyState } from 'src/components/Tables/EmptyStates/BaseEmptyState'
import { Address } from 'src/entities/base/Address'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Loan } from 'src/entities/domain/Loan'
import { Protocol } from 'src/entities/domain/Protocol'
import { useLoans } from 'src/services/hooks/loan/useLoans'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useHistoricalLoansTableState } from './useHistoricalLoansTableState'
import { useHistoricalLoansColumns, HistoricalLoansSide } from './useHistoricalLoansColumns'
import { HistoricalLoansFiltersForm } from './HistoricalLoansFiltersForm'
import { HistoricalLoansFilterTags } from './HistoricalLoansFilterTags'

type HistoricalLoanRow = LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>> & Loan<Protocol>

export type HistoricalLoansTableProps = {
  side: HistoricalLoansSide
  wallet: Address
}

export function HistoricalLoansTable({ side, wallet }: HistoricalLoansTableProps) {
  const { t } = useTranslation()
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    sortingParams,
    handleSortChange,
    filters,
    updateFilter,
    effectiveStatuses,
    filterStatus,
    clearAllFilters,
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  } = useHistoricalLoansTableState(side)

  const { data: loans, isLoading } = useLoans({
    filters: {
      [side]: wallet,
      statuses: effectiveStatuses,
    },
    pagination: { page, pageSize },
    sort: sortingParams,
  })

  const columns = useHistoricalLoansColumns(side)

  const getRowId = useCallback((row: HistoricalLoanRow) => row.id.toString(), [])

  const toolbar = useCallback(
    () => <DropdownFiltersToolbar
      filtersForm={<HistoricalLoansFiltersForm filters={filters} updateFilter={updateFilter} />}
      filtersTags={<HistoricalLoansFilterTags filters={filters} updateFilter={updateFilter} filterStatus={filterStatus} />}
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
    <TableServerPaginated<HistoricalLoanRow>
      {...getTestId(`${side}.historical-loans`)}
      rows={loans?.data || []}
      getRowId={getRowId}
      columns={columns}
      title={t('dashboard.historical-loans')}
      loading={isLoading}
      currentPage={page}
      currentPageSize={pageSize}
      totalDataCount={loans?.total || 0}
      onPaginationModelChange={params => {
        setPage(params.page)
        if (pageSize !== params.pageSize) {
          setPageSize(params.pageSize)
          setPage(0)
        }
      }}
      toolbar={toolbar}
      emptyState={emptyStateContent}
      sortingParams={sortingParams}
      onSortChange={handleSortChange as (field: string) => void}
      density={density}
      onDensityChange={setDensity}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
      hideColumnsWhenEmpty={true}
    />
  )
}
