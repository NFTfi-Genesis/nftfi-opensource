import { useTranslation } from 'src/modules/translation/useTranslation'
import { BaseEmptyState } from 'src/components/Tables/EmptyStates/BaseEmptyState'

export type WalletNftsEmptyStateProps = {
  allNftsCount: number
  visibleNftsCount: number
  resetAllFilters: () => void
}

export function WalletNftsEmptyState({ allNftsCount, visibleNftsCount, resetAllFilters }: WalletNftsEmptyStateProps) {
  const { t } = useTranslation()

  const isNoNftsInWallet = allNftsCount === 0
  const isNoVisibleNfts = allNftsCount > 0 && visibleNftsCount === 0

  if (isNoNftsInWallet) {
    return (
      <BaseEmptyState
        title={t('borrow.no-assets-found')}
        description={t('borrow.no-assets-description')}
      />
    )
  }

  if (isNoVisibleNfts) {
    return (
      <BaseEmptyState
        title={t('borrow.no-assets-visible')}
        description={t('borrow.no-assets-visible-description')}
        ctaAction={resetAllFilters}
        ctaText='filters.clear-filters'
      />
    )
  }

  // This case shouldn't happen when empty state needs to show, but handle defensively
  return (
    <BaseEmptyState
      title={t('borrow.no-assets-found')}
      description={t('borrow.no-assets-description')}
    />
  )
}
