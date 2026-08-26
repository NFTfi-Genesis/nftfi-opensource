import { useCallback, useMemo } from 'react'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { useListings } from 'src/services/hooks/listing/useListings'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { ListingsSortBy } from 'src/services/fetchers/listing/getListings'
import { getTestId } from 'src/utils/testing'
import { BaseEmptyState } from 'src/components/Tables/EmptyStates/BaseEmptyState'
import { useListingsTableState } from './useListingsTableState'
import { useListingsColumns, ListingsTableRow } from './useListingsColumns'
import { ListingsToolbar } from './ListingsToolbar'

export { type ListingsTableRow } from './useListingsColumns'

export type ListingsTableProps = {
  onRowClick?: (row: ListingsTableRow) => void
  selectedRow?: ListingsTableRow | null
  onViewOffers?: (row: ListingsTableRow) => void
}

export function ListingsTable({
  onRowClick,
  selectedRow,
  onViewOffers,
}: ListingsTableProps) {
  const { t } = useTranslation()
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    filtersDefaults,
    sortingParams,
    handleSortChange,
    updateFilter,
    resetAllFilters,
    filterStatus,
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  } = useListingsTableState()

  const { data, isLoading } = useListings({
    filters,
    pagination: {
      // TODO: instate an FE requirement to consistently use 0-based pagination, as MUI datagrid already expects, this will require refactoring the traversePages and relative hooks that use it.
      page: page + 1, // API uses 1-based pagination
      pageSize,
    },
    sort: sortingParams,
  })

  const columns = useListingsColumns({ onViewOffers })

  const toolbar = useCallback(
    () => (
      <ListingsToolbar
        filters={filters}
        filtersDefaults={filtersDefaults}
        filterStatus={filterStatus}
        updateFilter={updateFilter}
        resetAllFilters={resetAllFilters}
      />
    ),
    [filters, filtersDefaults, filterStatus, updateFilter, resetAllFilters]
  )

  const emptyState = useMemo(() => {
    const descriptionKey = filterStatus.hasActiveFilters
      ? 'listings.no-visible-listings-description'
      : 'listings.no-listings-description'
    return <BaseEmptyState title={t('listings.no-listings')} description={t(descriptionKey)} ctaAction={() => resetAllFilters()} ctaText='filters.clear' showClearFilters={filterStatus.hasActiveFilters} />
  }, [resetAllFilters, filterStatus, t])

  return (
    <TableServerPaginated<ListingsTableRow>
      {...getTestId('lend.listings')}
      title={t('navigation.loan-requests')}
      rows={data?.data ?? []}
      getRowId={row => `${row.nft.address}-${row.nft.id.toString()}`}
      loading={isLoading}
      columns={columns}
      currentPage={page}
      currentPageSize={pageSize}
      totalDataCount={data?.total ?? 0}
      sortingParams={sortingParams}
      onSortChange={
        (field: string) => handleSortChange(field as ListingsSortBy)
      }
      onPaginationModelChange={params => {
        setPage(params.page)
        if (pageSize !== params.pageSize) {
          setPageSize(params.pageSize)
          setPage(0)
        }
      }}
      onRowClick={onRowClick
        ? params => onRowClick(params.row)
        : undefined}
      getRowClassName={params =>
        selectedRow
          && params.row.nft.address === selectedRow.nft.address
          && params.row.nft.id === selectedRow.nft.id
          ? 'selected-row'
          : ''
      }
      toolbar={toolbar}
      density={density}
      onDensityChange={setDensity}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
      emptyState={emptyState}
    />
  )
}
