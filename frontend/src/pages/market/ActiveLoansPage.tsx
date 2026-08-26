import { useMemo, useState, useCallback } from 'react'
import { useEffectOnce } from 'react-use'
import { Helmet } from 'react-helmet-async'
import { ActiveLoansTable, ActiveLoansTableRow } from 'src/features/market/tables/activeLoans/market/MarketLoansTable'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { config } from 'src/config/config'
import { SidePanelView } from 'src/components/Views/SidePanelView'
import { SplitView } from 'src/components/Views/SplitView'
import { OverviewDrawer } from 'src/features/market/Overview/OverviewDrawer'
import { OverviewPanel } from 'src/features/market/Overview/OverviewPanel'
import { useWallet } from 'src/modules/wallet/useWallet'
import { LenderOffersTable } from 'src/features/offers/lendOffers/LenderOffersTable'
import { BorrowerOffersTable } from 'src/features/offers/borrowOffers/BorrowerOffersTable'
import { LoanEntityPreview } from 'src/features/market/tables/activeLoans/LoanEntityPreview'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { getTestId } from 'src/utils/testing'
import { MarketPagesTabs } from './MarketPagesTabs'

export function ActiveLoansPage() {
  const { t } = useTranslation()
  const { isMobileView } = useBreakpoints()
  const [overviewExpanded, setOverviewExpanded] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.OverviewExpanded)
  const [showOverview, setShowOverview] = useLocalStorage(LocalStorageKeys.DashboardUserPreferences.ShowOverview)
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.LoansSplit)
  const [loanSelected, setLoanSelected] = useState<ActiveLoansTableRow | null>(null)
  const { walletAddress } = useWallet()
  const { open: openMakeAssetOfferModal } = useModals(Modals.MakeAssetOffer)
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)
  const requireWallet = useRequireWallet()
  const isBorrower = useMemo(() => walletAddress?.toLowerCase() === loanSelected?.borrower.toLowerCase(), [walletAddress, loanSelected])

  useEffectOnce(() => {
    if (isMobileView) {
      setShowOverview(false)
    }
  })

  const handleViewOffers = useCallback((row: ActiveLoansTableRow) => {
    setLoanSelected(row)
  }, [])
  const handleMakeOffer = useCallback((row: ActiveLoansTableRow) => {
    requireWallet(() => {
      openMakeAssetOfferModal({ nft: row.nft, borrower: row.borrower })
    })
  }, [requireWallet, openMakeAssetOfferModal])

  const handleMakeCollectionOffer = useCallback((row: ActiveLoansTableRow) => {
    requireWallet(() => {
      openMakeCollectionOfferModal({ collection: row.nft.collection })
    })
  }, [requireWallet, openMakeCollectionOfferModal])

  return (
    <>
      <Helmet>
        <title>{t('page-titles.active-loans')}</title>
      </Helmet>
      <SidePanelView
        showSidePanel={showOverview && !config.showDashboardMaintenanceAlert && !loanSelected}
        sidePanelExpanded={overviewExpanded}
        setSidePanelExpanded={setOverviewExpanded}
        sidePanel={<OverviewPanel />}
        noBackground
      >
        <SplitView
          splitPercentage={splitPercentage}
          setSplitPercentage={setSplitPercentage}
          leftMinWidthPct={30}
          rightMinWidthPct={30}
          leftHeader={<MarketPagesTabs />}
          leftContent={
            <ActiveLoansTable
              onRowClick={setLoanSelected}
              selectedRow={loanSelected}
              onViewOffers={handleViewOffers}
            />}

          rightHeader={loanSelected && <LoanEntityPreview loan={loanSelected}
            prioritisedActions={!isBorrower
              ? [
                { label: t('lend.make-offer'), onClick: () => handleMakeOffer(loanSelected), ...getTestId('lend.make-offer') },
                { label: t('lend.make-collection-offer'), onClick: () => handleMakeCollectionOffer(loanSelected), ...getTestId('lend.make-collection-offer') },
              ]
              : null}
          />}
          rightContent={
            loanSelected
              ? isBorrower
                ? <BorrowerOffersTable loan={loanSelected} nft={loanSelected.nft} />
                : <LenderOffersTable loan={loanSelected} nft={loanSelected.nft} />
              : null
          }
          closeRightPanel={() => setLoanSelected(null)}
          showSidePanel={showOverview && !config.showDashboardMaintenanceAlert && !loanSelected}
        />
      </SidePanelView>

      {/* Overview Drawer - only visible on mobile */}
      {isMobileView && !config.showDashboardMaintenanceAlert && (
        <OverviewDrawer showOverview={showOverview} setShowOverview={setShowOverview} />
      )}
    </>
  )
}
