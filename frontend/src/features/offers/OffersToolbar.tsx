import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Offer } from 'src/entities/domain/Offer'
import { OffersFiltersForm } from './OffersFiltersForm'
import { OffersFilterTags } from './OffersFilterTags'
import { OffersFilterState } from './useOffersTablesState'

export type OffersToolbarProps = OffersFilterState & {
  offers: Offer[]
}

export function OffersToolbar({
  filters,
  filtersDefaults,
  updateFilter,
  filterStatus,
  resetAllFilters,
  offers,
}: OffersToolbarProps) {
  const { t } = useTranslation()

  return (
    <DropdownFiltersToolbar
      drawerType={DrawerType.OffersFilters}
      drawerTitle={t('borrow.filter-your-offers')}
      filtersForm={
        <OffersFiltersForm
          filtersState={filters}
          filterUpdate={updateFilter}
          offers={offers}
        />
      }
      filtersTags={
        <OffersFilterTags
          filters={filters}
          filtersDefaults={filtersDefaults}
          updateFilter={updateFilter}
          filterStatus={filterStatus}
        />
      }
      showClear={filterStatus.hasActiveFilters}
      resetAllFilters={resetAllFilters}
    />
  )
}
