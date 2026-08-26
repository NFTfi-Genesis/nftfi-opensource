import { useCallback, useMemo } from 'react'
import { BaseEmptyState } from 'src/components/Tables/EmptyStates/BaseEmptyState'
import { getTestId } from 'src/utils/testing'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TableServerPaginated } from 'src/components/Tables/TableServerPaginated'
import { useWhitelistedCollections } from 'src/services/hooks/collection/useWhitelistedCollections'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useCollectionsColumns } from './useCollectionsColumns'
import { useCollectionsTableState, CollectionsTableRow } from './useCollectionsTableState'
import { CollectionsFiltersForm } from './CollectionsFiltersForm'
import { CollectionsFilterTags } from './CollectionsFilterTags'

export type CollectionsTableProps = {
  onViewOffers?: (collection: CollectionsTableRow) => void
  selectedCollection?: CollectionsTableRow | null
}

export function CollectionsTable({ onViewOffers, selectedCollection }: CollectionsTableProps) {
  const { t } = useTranslation()
  const { page, pageSize, setPage, setPageSize, filters, updateFilter, filterStatus, resetAllFilters, sort, updateSort, density, setDensity, hiddenColumns, setHiddenColumns } = useCollectionsTableState()
  const { data, isLoading } = useWhitelistedCollections({ filters, pagination: { page, pageSize }, sort })
  const { columns } = useCollectionsColumns({ onViewOffers })

  const collectionsToolbar = useCallback(() => (
    <DropdownFiltersToolbar
      filtersForm={
        <CollectionsFiltersForm
          filtersState={filters}
          updateFilter={updateFilter}
        />
      }
      filtersTags={
        <CollectionsFilterTags
          filters={filters}
          updateFilter={updateFilter}
          filterStatus={filterStatus}
        />
      }
      showClear={filterStatus.hasActiveFilters}
      resetAllFilters={resetAllFilters}
      filtersDropdownWidth={337}
      drawerType={DrawerType.WallletNftsFilters}
      drawerTitle={t('borrow.filter-your-assets')}
    />
  ), [filters, updateFilter, filterStatus, resetAllFilters, t])

  const emptyState = useMemo(() => {
    const descriptionKey = filterStatus.hasActiveFilters
      ? 'collections.no-available-collections-found-description'
      : 'collections.no-collections-found-description'
    return <BaseEmptyState title={t('collections.no-collections-found')} description={t(descriptionKey)} ctaAction={() => resetAllFilters()} ctaText='filters.clear' showClearFilters={filterStatus.hasActiveFilters} />
  }, [resetAllFilters, filterStatus, t])

  return (
    <TableServerPaginated<CollectionsTableRow>
      {...getTestId('lend.collections')}
      rows={data?.data || []}
      getRowId={row => row.id}
      onRowClick={params => onViewOffers?.(params.row)}
      columns={columns}
      title={t('collections.collection')}
      loading={isLoading}
      currentPage={page}
      currentPageSize={pageSize}
      totalDataCount={data?.total || 0}
      onPaginationModelChange={model => {
        setPage(model.page)
        setPageSize(model.pageSize)
      }}
      sortingParams={sort}
      onSortChange={updateSort}
      toolbar={collectionsToolbar}
      getRowClassName={params => (selectedCollection && params.row.id === selectedCollection.id)
        ? 'selected-row'
        : ''}
      density={density}
      onDensityChange={setDensity}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
      emptyState={emptyState}
    />
  )
}
