import { useCallback, useMemo } from 'react'
import { Stack } from '@mui/material'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { BorrowerStats } from 'src/entities/app/BorrowerStats'
import { BorrowerEmptyState } from 'src/components/Tables/EmptyStates/BorrowerEmptyState'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { useBorrowerStats } from 'src/services/hooks/overview/useBorrowerStats'
import { getTestId } from 'src/utils/testing'
import { MarketToolbar } from '../MarketToolbar'
import { useBorrowersColumns } from './useBorrowersColumns'
import { useBorrowersTableState } from './useBorrowersTableState'

export function BorrowersTable() {
  const [, setShowOverview] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.ShowOverview)
  const { t } = useTranslation()

  // Table state
  const {
    tableState,
    handleChangeTableStateParams,
    sortingParams,
    paginationParams,
    handleSortChange,
    filters,
    handleChangeFilters,
    clearAllFilters,
    resetPageParam,
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
    getIsRowSelected,
  } = useBorrowersTableState()

  // Data fetching
  const { data: borrowerStats, isLoading } = useBorrowerStats({
    filters,
    pagination: paginationParams,
    sort: sortingParams,
  })

  // Columns
  const { columns } = useBorrowersColumns()

  const getRowId = useCallback((row: BorrowerStats) => row.borrowerAddress, [])

  const toolbar = useCallback(
    () => <MarketToolbar resetPage={resetPageParam} filterKeys={['protocol', 'collectionIds', 'currency', 'dueWithin', 'borrower']} />,
    [resetPageParam]
  )

  const emptyStateContent = useMemo(() => <BorrowerEmptyState clearAllFilters={clearAllFilters} />, [clearAllFilters])

  return (
    <Stack gap={3} width='100%' height='100%'>
      <TableServerPaginated<BorrowerStats>
        {...getTestId('market.borrowers')}
        rows={borrowerStats?.data || []}
        getRowId={getRowId}
        columns={columns}
        title={t('dashboard.Borrowers')}
        loading={isLoading}
        currentPage={tableState.page ?? 0}
        currentPageSize={tableState.pageSize ?? TablePageSizes.Size25}
        totalDataCount={borrowerStats?.total || 0}
        onPaginationModelChange={handleChangeTableStateParams as (params: PaginationParams) => void}
        toolbar={toolbar}
        onRowClick={params => {
          setShowOverview(true)
          handleChangeFilters({ borrower: params.row.borrowerAddress })
        }}
        getRowClassName={params => (
          getIsRowSelected(params.row)
            ? 'selected-row'
            : ''
        )}
        emptyState={emptyStateContent}
        density={density}
        onDensityChange={setDensity}
        columnVisibilityModel={hiddenColumns}
        onColumnVisibilityModelChange={setHiddenColumns}
        sortingParams={sortingParams}
        onSortChange={handleSortChange as (field: string) => void}
      />
    </Stack>
  )
}
