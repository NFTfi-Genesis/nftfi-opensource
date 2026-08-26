import { memo, useMemo } from 'react'
import { TabsContainer } from 'src/components/TabsContainer'
import { useTranslation } from 'src/modules/translation/useTranslation'

export const MarketPagesTabs = memo(function MarketPageTabs() {
  const { t } = useTranslation()

  const tabs = useMemo(
    () => [
      {
        label: t('dashboard.active-loans'),
        url: '/market/active-loans',
      },
      {
        label: t('dashboard.Lenders'),
        url: '/market/lenders',
      },
      {
        label: t('dashboard.Borrowers'),
        url: '/market/borrowers',
      },
    ],
    [t],
  )

  return (
    <TabsContainer
      tabs={tabs}
      defaultTab={0}
    />
  )
})
