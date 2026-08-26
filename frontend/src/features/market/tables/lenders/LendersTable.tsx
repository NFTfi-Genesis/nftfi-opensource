import { Stack } from '@mui/material'
import { useCallback, useMemo } from 'react'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { LenderEmptyState } from 'src/components/Tables/EmptyStates/LenderEmptyState'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LenderStats } from 'src/entities/app/LenderStats'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { useLenderStats } from 'src/services/hooks/overview/useLenderStats'
import { getTestId } from 'src/utils/testing'
import { MarketToolbar } from '../MarketToolbar'
import { useLendersColumns } from './useLendersColumns'
import { useLendersTableState } from './useLendersTableState'

export function LendersTable() {
  const { t } = useTranslation()
  const [, setShowOverview] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.ShowOverview)

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
  } = useLendersTableState()

  // Data fetching
  const { data: lenderStats, isLoading } = useLenderStats({
    filters,
    pagination: paginationParams,
    sort: sortingParams,
  })

  // Columns
  const { columns } = useLendersColumns()

  const getRowId = useCallback((row: LenderStats) => row.lenderAddress, [])

  const toolbar = useCallback(
    () => <MarketToolbar resetPage={resetPageParam} filterKeys={['protocol', 'collectionIds', 'currency', 'dueWithin', 'lender']} />,
    [resetPageParam]
  )

  const emptyStateContent = useMemo(() => <LenderEmptyState clearAllFilters={clearAllFilters} />, [clearAllFilters])

  return (
    <Stack gap={3} width='100%' height='100%'>
      <TableServerPaginated<LenderStats>
        {...getTestId('market.lenders')}
        rows={lenderStats?.data || []}
        getRowId={getRowId}
        columns={columns}
        title={t('dashboard.Lenders')}
        loading={isLoading}
        currentPage={tableState.page ?? 0}
        currentPageSize={tableState.pageSize ?? TablePageSizes.Size25}
        totalDataCount={lenderStats?.total || 0}
        onPaginationModelChange={handleChangeTableStateParams as (params: PaginationParams) => void}
        toolbar={toolbar}
        onRowClick={params => {
          setShowOverview(true)
          handleChangeFilters({ lender: params.row.lenderAddress })
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
