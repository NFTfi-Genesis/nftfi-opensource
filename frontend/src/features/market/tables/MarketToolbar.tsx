import { useMemo } from 'react'
import { DropdownFiltersToolbar } from 'src/components/Tables/Toolbars/DropdownFiltersToolbar'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { OverviewToggleButton } from 'src/features/market/Overview/OverviewToggleButton'
import { MarketFiltersForm } from './activeLoans/market/MarketFiltersForm'
import { DashboardFilterTags } from './activeLoans/market/MarketFilterTags'
import { useMarketFilters, MarketFilters as DashboardFiltersType } from './useMarketFilters'

interface MarketToolbarProps {
  resetPage: (params: URLSearchParams) => URLSearchParams
  filterKeys: (keyof DashboardFiltersType)[]
}

export function MarketToolbar({ resetPage, filterKeys }: MarketToolbarProps) {
  const { t } = useTranslation()
  const { pickFilters, clearAllFilters } = useMarketFilters()

  const filters = useMemo(() => pickFilters(filterKeys), [pickFilters, filterKeys])

  const showClearFilters = useMemo(() => {
    return Object.entries(filters).some(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return !!value
    })
  }, [filters])

  return (
    <DropdownFiltersToolbar
      filtersForm={<MarketFiltersForm resetPage={resetPage} />}
      filtersTags={<DashboardFilterTags resetPage={resetPage} />}
      showClear={showClearFilters}
      resetAllFilters={clearAllFilters}
      drawerType={DrawerType.DashboardFilters}
      drawerTitle={t('filters.filters')}
      additionalActions={<OverviewToggleButton />}
    />
  )
}
