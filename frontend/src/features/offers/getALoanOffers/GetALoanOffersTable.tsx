import { useCallback, useMemo } from 'react'
import { TableBase, PaginationMode } from 'src/components/Tables/TableBase'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TKey } from 'src/modules/translation/TKey'
import { useOffersForNftWithCollectionStats } from 'src/services/hooks/offer/useOffersForNftWithCollectionStats'
import { OfferExtended } from 'src/entities/app/OfferExtended'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { WalletNftsTableRow } from 'src/features/nfts/walletNfts/WalletNftsTable'
import { OffersEmptyState } from 'src/components/Tables/EmptyStates/OffersEmptyState'
import { hasAnyValue } from 'src/utils/objects'
import { getTestId } from 'src/utils/testing'
import { useOffersTablesState } from '../useOffersTablesState'
import { OffersToolbar } from '../OffersToolbar'
import { useGetALoanOffersColumns } from './useGetALoanOffersColumns'

type GetALoanOffersTableProps = {
  nft: WalletNftsTableRow
  onList: (nft: WalletNftsTableRow) => void
  onEdit: (nft: WalletNftsTableRow) => void
  selectedRow: WalletNftsTableRow | null
}

export function GetALoanOffersTable({ nft, onList, onEdit, selectedRow }: GetALoanOffersTableProps) {
  const { t } = useTranslation()

  // Data fetching
  const { data: offersData, isUpdating } = useOffersForNftWithCollectionStats({ nft })

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
  } = useOffersTablesState<OfferExtended<CollectionStats>[]>(offersData ?? null)

  // Columns
  const { columns } = useGetALoanOffersColumns({ nft })

  const offersToolbar = useCallback(() => <OffersToolbar
    filters={filters}
    filtersDefaults={filtersDefaults}
    updateFilter={updateFilter}
    filterStatus={filterStatus}
    resetAllFilters={resetAllFilters}
    offers={offersData ?? []} />,
  [filters, filtersDefaults, updateFilter, filterStatus, resetAllFilters, offersData])

  const emptyState = useMemo(() => {
    let ctaText: TKey = 'filters.clear'
    let ctaAction = () => resetAllFilters()
    let description: TKey = 'offers.no-visible-offers-description'
    const hasFilters = hasAnyValue(filterStatus)
    if(selectedRow && !hasFilters) {
      if (!selectedRow?.listing) {
        ctaText = 'borrow.list-asset'
        ctaAction = () => onList(selectedRow)
        description = 'offers.no-offers-description'
      } else if (selectedRow?.listing) {
        ctaText = 'borrow.edit-terms'
        ctaAction = () => onEdit(selectedRow)
        description = 'offers.no-offers-description'
      }
    }
    return { ctaText, ctaAction, description, hasFilters }
  }, [selectedRow, onList, onEdit, resetAllFilters, filterStatus])

  const emptyStateContent = useMemo(() => <OffersEmptyState ctaAction={emptyState.ctaAction} ctaText={emptyState.ctaText} description={emptyState.description} showClearFilters={emptyState.hasFilters} />, [emptyState])

  return (
    <TableBase<OfferExtended<CollectionStats>>
      title={t('borrow.offers')}
      {...getTestId('borrow.offers')}
      rows={processedData}
      columns={columns}
      getRowId={row => row.id}
      loading={isUpdating}
      paginationMode={PaginationMode.CLIENT}
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={model => {
        setPage(model.page)
        setPageSize(model.pageSize)
      }}
      sortingParams={sortingParams}
      onSortChange={handleSortChange}
      toolbar={offersToolbar}
      emptyState={emptyStateContent}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
      density={density}
      onDensityChange={setDensity}
    />
  )
}
