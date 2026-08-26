import { useTranslation } from 'src/modules/translation/useTranslation'
import { BaseEmptyState } from './BaseEmptyState'

interface LoansMaturingEmptyStateProps {
  clearAllFilters: () => void
  showClearFilters: boolean
}

export function LoansMaturingEmptyState({
  clearAllFilters,
  showClearFilters,
}: LoansMaturingEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <BaseEmptyState
      title={t('dashboard.no-loans-found')}
      description={t('dashboard.adjust-or-clear-filters')}
      ctaAction={showClearFilters
        ? clearAllFilters
        : undefined}
      showClearFilters={showClearFilters}
    />
  )
}
