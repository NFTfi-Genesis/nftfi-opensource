import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useTranslation } from 'src/modules/translation/useTranslation'
import type { ListingsFilters } from 'src/services/fetchers/listing/getListings'
import { ListingsFiltersForm } from './ListingsFiltersForm'
import { ListingsFilterTags } from './ListingsFilterTags'
import type { ListingsFiltersStatus, UpdateListingsFilter } from './useListingsTableState'

interface ListingsToolbarProps {
  filters: ListingsFilters
  filtersDefaults: ListingsFilters
  filterStatus: ListingsFiltersStatus
  updateFilter: UpdateListingsFilter
  resetAllFilters: () => void
}

export function ListingsToolbar({
  filters,
  filtersDefaults,
  filterStatus,
  updateFilter,
  resetAllFilters,
}: ListingsToolbarProps) {
  const { t } = useTranslation()

  return (
    <DropdownFiltersToolbar
      filtersForm={(
        <ListingsFiltersForm
          filtersState={filters}
          filterUpdate={updateFilter}
        />
      )}
      filtersTags={(
        <ListingsFilterTags
          filters={filters}
          filtersDefaults={filtersDefaults}
          updateFilter={updateFilter}
          filterStatus={filterStatus}
        />
      )}
      showClear={filterStatus.hasActiveFilters}
      resetAllFilters={resetAllFilters}
      drawerType={DrawerType.DashboardFilters}
      drawerTitle={t('filters.filters')}
      inlineFiltersTags
    />
  )
}
