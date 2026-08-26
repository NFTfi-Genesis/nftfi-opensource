import { useCallback, useMemo } from 'react'
import { Nft } from 'src/entities/domain/Nft'
import { TableBase, PaginationMode } from 'src/components/Tables/TableBase'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useOffersForNftWithCollectionStats } from 'src/services/hooks/offer/useOffersForNftWithCollectionStats'
import { OfferExtended } from 'src/entities/app/OfferExtended'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { OfferStatus } from 'src/entities/domain/Offer'
import { getTestId } from 'src/utils/testing'
import { OffersEmptyState } from 'src/components/Tables/EmptyStates/OffersEmptyState'
import { OffersToolbar } from '../OffersToolbar'
import { useOffersTablesState } from '../useOffersTablesState'
import { useBorrowerOffersColumns } from './useBorrowerOffersColumns'

type BorrowerOffersTableProps = {
  nft: Nft | null
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export function BorrowerOffersTable({ nft, loan }: BorrowerOffersTableProps) {
  const { t } = useTranslation()

  // Data fetching
  const { data: offersData, isLoading } = useOffersForNftWithCollectionStats({ nft: nft!, loan })
  const validOffers = useMemo(() => offersData?.filter(offer => offer.status === OfferStatus.Active), [offersData])

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
  } = useOffersTablesState<OfferExtended<CollectionStats>[]>(validOffers ?? null)

  // Columns
  const { columns } = useBorrowerOffersColumns({ loan })

  const offersToolbar = useCallback(() => <OffersToolbar
    filters={filters}
    filtersDefaults={filtersDefaults}
    updateFilter={updateFilter}
    filterStatus={filterStatus}
    resetAllFilters={resetAllFilters}
    offers={offersData ?? []} />,
  [filters, filtersDefaults, updateFilter, filterStatus, resetAllFilters, offersData])

  const emptyState = useMemo(() => {
    const descriptionKey = filterStatus.hasActiveFilters
      ? 'offers.no-visible-offers-description'
      : 'offers.no-offers-description'
    return <OffersEmptyState ctaAction={() => resetAllFilters()} ctaText='filters.clear' description={descriptionKey} showClearFilters={filterStatus.hasActiveFilters} />
  }, [resetAllFilters, filterStatus])

  return (
    <TableBase<OfferExtended<CollectionStats>>
      {...getTestId('borrow.offers')}
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
