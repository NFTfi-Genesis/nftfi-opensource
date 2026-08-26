import { useTranslation } from 'src/modules/translation/useTranslation'
import { BaseEmptyState } from './BaseEmptyState'

interface LenderEmptyStateProps {
  clearAllFilters: () => void
}

export function LenderEmptyState({
  clearAllFilters,
}: LenderEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <BaseEmptyState
      title={t('dashboard.no-lenders-found')}
      description={t('dashboard.adjust-or-clear-filters-lenders')}
      ctaAction={clearAllFilters}
      showClearFilters={true}
    />
  )
}
