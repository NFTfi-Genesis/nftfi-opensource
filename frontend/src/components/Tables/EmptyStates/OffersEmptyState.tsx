import { useTranslation } from 'src/modules/translation/useTranslation'
import { TKey } from 'src/modules/translation/TKey'
import { BaseEmptyState } from './BaseEmptyState'

interface OffersEmptyStateProps {
  ctaAction: () => void
  ctaText: TKey
  description: TKey
  showClearFilters: boolean
}

export function OffersEmptyState({ ctaAction, ctaText, description, showClearFilters }: OffersEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <BaseEmptyState
      title={t('offers.no-offers')}
      description={t(description)}
      ctaText={ctaText}
      ctaAction={ctaAction}
      showClearFilters={showClearFilters}
    />
  )
}
