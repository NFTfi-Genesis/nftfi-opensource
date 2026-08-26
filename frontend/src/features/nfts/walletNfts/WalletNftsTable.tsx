import { useCallback } from 'react'
import { GridRowParams } from '@mui/x-data-grid'
import { TableBase, PaginationMode } from 'src/components/Tables/TableBase'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Listing } from 'src/entities/domain/Listing'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useWalletNftsWithListings } from 'src/services/hooks/nft/useWalletNftsWithListings'
import { getTestId } from 'src/utils/testing'
import { useWalletNftsTableState } from './useWalletNftsTableState'
import { useWalletNftsColumns } from './useWalletNftsColumns'
import { WalletNftsFilterTags } from './WalletNftsFilterTags'
import { WalletNftsFiltersForm } from './WalletNftsFiltersForm'
import { WalletNftsEmptyState } from './WalletNftsEmptyState'

export type WalletNftsTableRow = NftExtended<NftInfo | CollectionExtended<CollectionInfo | CollectionStats> | Listing>

type WalletNftsTableProps = {
  onList: (row: WalletNftsTableRow) => void
  onEdit: (row: WalletNftsTableRow) => void
  onUnlist: (row: WalletNftsTableRow) => void
  onViewOffers: (row: WalletNftsTableRow) => void
  onRowClick?: (row: WalletNftsTableRow) => void
  selectedRow?: WalletNftsTableRow | null
}

export function WalletNftsTable({
  onList,
  onEdit,
  onUnlist,
  onViewOffers,
  onRowClick,
  selectedRow,
}: WalletNftsTableProps) {
  const { t } = useTranslation()

  // Data fetching
  const { walletAddress } = useWallet()
  const { data: nftsData, isLoading } = useWalletNftsWithListings(walletAddress!)
  const rows = nftsData ?? undefined

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

    // View prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  } = useWalletNftsTableState(rows)

  // Columns
  const { columns } = useWalletNftsColumns({
    onList,
    onEdit,
    onUnlist,
    onViewOffers,
  })

  // Toolbar
  const walletNftsToolbar = useCallback(() => (
    <DropdownFiltersToolbar
      filtersForm={
        <WalletNftsFiltersForm
          filtersState={filters}
          updateFilter={updateFilter}
          rows={rows}
        />
      }
      filtersTags={
        <WalletNftsFilterTags
          filters={filters}
          filtersDefaults={filtersDefaults}
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
  ), [filters, filtersDefaults, updateFilter, filterStatus, resetAllFilters, rows, t])

  return (
    <TableBase<WalletNftsTableRow>
      {...getTestId('borrow.assets')}
      title='Collections'
      rows={processedData}
      columns={columns}
      getRowId={row => `${row.address}-${row.id}`}
      loading={isLoading}
      paginationMode={PaginationMode.CLIENT}
      paginationModel={{ page: page, pageSize: pageSize }}
      onPaginationModelChange={model => {
        setPage(model.page)
        setPageSize(model.pageSize)
      }}
      sortingParams={sortingParams}
      onSortChange={handleSortChange}
      toolbar={walletNftsToolbar}
      onRowClick={(params: GridRowParams<WalletNftsTableRow>) => onRowClick?.(params.row)}
      getRowClassName={(params: { row: WalletNftsTableRow }) =>
        selectedRow && selectedRow.address === params.row.address && selectedRow.id === params.row.id
          ? 'selected-row'
          : ''}
      emptyState={<WalletNftsEmptyState allNftsCount={nftsData?.length ?? 0} visibleNftsCount={processedData.length} resetAllFilters={resetAllFilters} />}
      density={density}
      onDensityChange={setDensity}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
    />
  )
}
