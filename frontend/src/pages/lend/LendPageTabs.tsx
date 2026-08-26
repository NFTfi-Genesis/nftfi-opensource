import { memo, useMemo } from 'react'
import { TabsContainer } from 'src/components/TabsContainer'
import { useTranslation } from 'src/modules/translation/useTranslation'

export const LendPageTabs = memo(function LendPageTabs({ showBorderLine = true }: { showBorderLine?: boolean }) {
  const { t } = useTranslation()

  const tabs = useMemo(
    () => [
      {
        label: t('navigation.collection-offers'),
        url: '/lend/collections',
      },
      {
        label: t('navigation.refinance-loans'),
        url: '/lend/refinance',
      },
      {
        label: t('navigation.loan-requests'),
        url: '/lend/listings',
      },
      {
        label: t('navigation.manage-my-offers'),
        url: '/lend/my-offers',
      },
      {
        label: t('navigation.history'),
        url: '/lend/history',
      },
    ],
    [t],
  )

  return (
    <TabsContainer
      tabs={tabs}
      defaultTab={0}
      showBorderLine={showBorderLine}
    />
  )
})
