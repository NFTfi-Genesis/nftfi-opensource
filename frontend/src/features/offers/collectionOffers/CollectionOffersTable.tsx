import { useCallback, useMemo } from 'react'
import { Offer } from 'src/entities/domain/Offer'
import { TableBase, PaginationMode } from 'src/components/Tables/TableBase'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useOffersForCollection } from 'src/services/hooks/offer/useOffersForCollection'
import { Collection } from 'src/entities/domain/Collection'
import { getTestId } from 'src/utils/testing'
import { OffersEmptyState } from 'src/components/Tables/EmptyStates/OffersEmptyState'
import {
  useOffersTablesState,
} from '../useOffersTablesState'
import { OffersToolbar } from '../OffersToolbar'
import { useLenderOffersColumns } from '../lendOffers/useLenderOffersColumns'

type CollectionOffersTableProps = {
  collection: Collection
}

export function CollectionOffersTable({ collection }: CollectionOffersTableProps) {
  const { t } = useTranslation()

  // Data fetching
  const { data: offersData, isLoading } = useOffersForCollection(collection)

  // Table state
  const {
    filters,
    filtersDefaults,
    updateFilter,
    filterStatus,
    resetAllFilters,
    processedData,
    page,
    pageSize,
    setPage,
    setPageSize,
    sortingParams,
    handleSortChange,
    hiddenColumns,
    setHiddenColumns,
    density,
    setDensity,
  } = useOffersTablesState(offersData ?? null)

  // Columns
  const { columns } = useLenderOffersColumns()

  const offersToolbar = useCallback(() => <OffersToolbar
    filters={filters}
    filtersDefaults={filtersDefaults}
    updateFilter={updateFilter}
    filterStatus={filterStatus}
    resetAllFilters={resetAllFilters}
    offers={offersData ?? []}
  />, [filters, filtersDefaults, updateFilter, filterStatus, resetAllFilters, offersData])

  const emptyState = useMemo(() => {
    const descriptionKey = filterStatus.hasActiveFilters
      ? 'offers.no-visible-offers-collection-description'
      : 'offers.no-offers-collection-description'
    return <OffersEmptyState ctaAction={() => resetAllFilters()} ctaText='filters.clear' description={descriptionKey} showClearFilters={filterStatus.hasActiveFilters} />
  }, [resetAllFilters, filterStatus])

  return (
    <TableBase<Offer>
      {...getTestId('lend.offers')}
      title={t('borrow.offers')}
      rows={processedData}
      columns={columns}
      getRowId={row => row.id}
      loading={isLoading}
      paginationMode={PaginationMode.CLIENT}
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={model => {
        setPage(model.page)
        setPageSize(model.pageSize)
      }}
      sortingParams={sortingParams}
      onSortChange={handleSortChange}
      toolbar={offersToolbar}
      emptyState={emptyState}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
      density={density}
      onDensityChange={setDensity}
    />
  )
}
