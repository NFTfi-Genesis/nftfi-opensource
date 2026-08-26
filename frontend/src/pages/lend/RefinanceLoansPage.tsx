import { useState, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Stack } from '@mui/material'
import { ActiveLoansTableRow, RefinancingLoansTable } from 'src/features/market/tables/activeLoans/refinancing/RefinancingLoansTable'
import { LenderOffersTable } from 'src/features/offers/lendOffers/LenderOffersTable'
import { SplitView } from 'src/components/Views/SplitView'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LoanEntityPreview } from 'src/features/market/tables/activeLoans/LoanEntityPreview'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { useWallet } from 'src/modules/wallet/useWallet'
import { getTestId } from 'src/utils/testing'
import { ConnectWalletWarning } from 'src/components/ConnectWallet/ConnectWalletWarning'
import { Panel } from 'src/components/Panel'
import { LendPageTabs } from './LendPageTabs'

export function RefinanceLoansPage() {
  const { walletAddress } = useWallet()
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.LoansSplit)
  const [loanSelected, setLoanSelected] = useState<ActiveLoansTableRow | null>(null)
  const { t } = useTranslation()
  const { open: openMakeAssetOfferModal } = useModals(Modals.MakeAssetOffer)
  const { open: openMakeCollectionOfferModal } = useModals(Modals.MakeCollectionOffer)
  const requireWallet = useRequireWallet()

  const isBorrower = useMemo(() => walletAddress?.toLowerCase() === loanSelected?.borrower.toLowerCase(), [walletAddress, loanSelected])

  // Loans Actions
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

  const content = useMemo(() => {
    if (!walletAddress) {
      return <Panel fullWidth fullHeight noPadding>
        <Stack direction='column' gap={0} height='100%' width='100%'>
          <LendPageTabs />
          <ConnectWalletWarning />
        </Stack>
      </Panel>
    }

    return <SplitView
      splitPercentage={splitPercentage}
      setSplitPercentage={setSplitPercentage}

      leftHeader={<LendPageTabs />}
      leftContent={
        <RefinancingLoansTable
          onRowClick={setLoanSelected}
          selectedRow={loanSelected}
          onViewOffers={handleViewOffers}
        />
      }

      rightHeader={loanSelected && (
        <LoanEntityPreview
          loan={loanSelected}
          prioritisedActions={
            isBorrower
              ? null
              : [
                { label: t('lend.make-offer'), onClick: () => handleMakeOffer(loanSelected), ...getTestId('lend.make-offer') },
                { label: t('lend.make-collection-offer'), onClick: () => handleMakeCollectionOffer(loanSelected), ...getTestId('lend.make-collection-offer') },
              ]
          }
        />
      )}
      rightContent={
        loanSelected
          ? <LenderOffersTable loan={loanSelected} nft={loanSelected.nft} />
          : null
      }
      closeRightPanel={() => setLoanSelected(null)}
    />
  }, [walletAddress, splitPercentage, setSplitPercentage, loanSelected, isBorrower, t, handleMakeOffer, handleMakeCollectionOffer, handleViewOffers, setLoanSelected])

  return (
    <>
      <Helmet>
        <title>{t('page-titles.refinance-loans')}</title>
      </Helmet>
      {content}
    </>
  )
}
