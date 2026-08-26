import { useCallback, useMemo } from 'react'
import { BaseEmptyState } from 'src/components/Tables/EmptyStates/BaseEmptyState'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TableBase, PaginationMode } from 'src/components/Tables/TableBase'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { useOffersByLender } from 'src/services/hooks/offer/useOffersByLender'
import { useWallet } from 'src/modules/wallet/useWallet'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { AssetOfferExtended, CollectionOfferExtended, ContractOfferExtended } from 'src/entities/app/OfferExtended'
import { useManageOffersColumns } from './useManageOffersColumns'
import { ManageOffersTableRow, useManageOffersTableState } from './useManageOffersTableState'
import { ManageOffersFiltersForm } from './ManageOffersFiltersForm'
import { ManageOffersFilterTags } from './ManageOffersFilterTags'

export type ManageOffersTableProps = {
  onRowClick?: (row: ManageOffersTableRow) => void
  selectedRow?: ManageOffersTableRow | null
}

export function ManageOffersTable({ onRowClick, selectedRow }: ManageOffersTableProps) {
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { data, isLoading } = useOffersByLender(walletAddress)
  const {
    page,
    setPage,
    pageSize,
    setPageSize,

    // View preferences
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,

    // Sorting
    sortingParams,
    handleSortChange,

    // Filters
    filters,
    filtersDefaults: defaultFilters,
    updateFilter,
    resetAllFilters,
    filterStatus,

    // Processed data
    processedData,
  } = useManageOffersTableState(data ?? [])

  const columns = useManageOffersColumns()

  const paginationModel = useMemo(() => ({ page, pageSize }), [page, pageSize])

  const emptyState = useMemo(() => {
    const descriptionKey = filterStatus.hasActiveFilters
      ? 'offers.no-user-visible-offers-description'
      : 'offers.no-user-offers-description'
    return <BaseEmptyState title={t('offers.no-offers')} description={t(descriptionKey)} ctaAction={() => resetAllFilters()} ctaText='filters.clear' showClearFilters={filterStatus.hasActiveFilters} />
  }, [resetAllFilters, filterStatus, t])

  const toolbar = useCallback(() => (
    <DropdownFiltersToolbar
      drawerType={DrawerType.OffersFilters}
      drawerTitle={t('borrow.filter-your-offers')}
      filtersForm={
        <ManageOffersFiltersForm
          filtersState={filters}
          updateFilter={updateFilter}
          // Passing the raw data to avoid deriving filters options from already filtered data
          rows={data ?? []}
        />}
      filtersTags={
        <ManageOffersFilterTags
          filters={filters}
          filtersDefaults={defaultFilters}
          updateFilter={updateFilter}
          filterStatus={filterStatus}
        />}
      showClear={filterStatus.hasActiveFilters}
      resetAllFilters={resetAllFilters}
    />
  ), [filters, defaultFilters, updateFilter, filterStatus, resetAllFilters, data, t])

  return (
    <TableBase<
      | AssetOfferExtended<OfferValidated>
      | CollectionOfferExtended<OfferValidated>
      | ContractOfferExtended<OfferValidated>
    >
      toolbar={toolbar}
      rows={processedData}
      sortingParams={sortingParams}
      onSortChange={handleSortChange}
      getRowId={row => row.id}
      loading={isLoading}
      columns={columns}
      title={t('navigation.manage-my-offers')}
      paginationMode={PaginationMode.CLIENT}
      paginationModel={paginationModel}
      onPaginationModelChange={params => {
        setPage(params.page)
        if (pageSize !== params.pageSize) {
          setPageSize(params.pageSize)
          setPage(0)
        }
      }}
      density={density}
      onDensityChange={setDensity}
      columnVisibilityModel={hiddenColumns}
      onColumnVisibilityModelChange={setHiddenColumns}
      emptyState={emptyState}
      onRowClick={onRowClick
        ? params => onRowClick(params.row)
        : undefined}
      getRowClassName={params =>
        selectedRow && params.row.id === selectedRow.id
          ? 'selected-row'
          : ''
      }
    />
  )
}
