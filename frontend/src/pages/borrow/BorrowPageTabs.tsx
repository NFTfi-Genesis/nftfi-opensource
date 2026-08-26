import { memo, useMemo } from 'react'
import { TabsContainer } from 'src/components/TabsContainer'
import { useTranslation } from 'src/modules/translation/useTranslation'

export const BorrowPageTabs = memo(function BorrowPageTabs({ showBorderLine = true }: { showBorderLine?: boolean }) {
  const { t } = useTranslation()

  const tabs = useMemo(
    () => [
      {
        label: t('navigation.get-a-loan'),
        url: '/borrow/get-a-loan',
      },
      {
        label: t('navigation.my-loans'),
        url: '/borrow/my-loans',
      },
      {
        label: t('navigation.history'),
        url: `/borrow/history`,
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
