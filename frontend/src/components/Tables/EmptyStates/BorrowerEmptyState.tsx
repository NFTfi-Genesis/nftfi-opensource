import { useTranslation } from 'src/modules/translation/useTranslation'
import { BaseEmptyState } from './BaseEmptyState'

interface BorrowerEmptyStateProps {
  clearAllFilters: () => void
}

export function BorrowerEmptyState({
  clearAllFilters,
}: BorrowerEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <BaseEmptyState
      title={t('dashboard.no-borrowers-found')}
      description={t('dashboard.adjust-or-clear-filters-borrowers')}
      ctaAction={clearAllFilters}
      showClearFilters={true}
    />
  )
}
