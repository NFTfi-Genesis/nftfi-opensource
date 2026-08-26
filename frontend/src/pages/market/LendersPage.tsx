import { useEffectOnce } from 'react-use'
import { Helmet } from 'react-helmet-async'
import { LendersTable } from 'src/features/market/tables/lenders/LendersTable'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { config } from 'src/config/config'
import { SidePanelView } from 'src/components/Views/SidePanelView'
import { OverviewDrawer } from 'src/features/market/Overview/OverviewDrawer'
import { OverviewPanel } from 'src/features/market/Overview/OverviewPanel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { MarketPagesTabs } from './MarketPagesTabs'

export function LendersPage() {
  const { t } = useTranslation()
  const { isMobileView } = useBreakpoints()
  const [overviewExpanded, setOverviewExpanded] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.OverviewExpanded)
  const [showOverview, setShowOverview] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.ShowOverview)

  useEffectOnce(() => {
    if (isMobileView) {
      setShowOverview(false)
    }
  })

  return (
    <>
      <Helmet>
        <title>{t('page-titles.lenders')}</title>
      </Helmet>
      <SidePanelView
        header={<MarketPagesTabs />}
        showSidePanel={showOverview && !config.showDashboardMaintenanceAlert}
        sidePanelExpanded={overviewExpanded}
        setSidePanelExpanded={setOverviewExpanded}
        sidePanel={<OverviewPanel />}
      >
        <LendersTable />
      </SidePanelView>

      {/* Overview Drawer - only visible on mobile */}
      {isMobileView && !config.showDashboardMaintenanceAlert && (
        <OverviewDrawer showOverview={showOverview} setShowOverview={setShowOverview} />
      )}
    </>
  )
}
