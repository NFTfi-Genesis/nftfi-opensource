import { useCallback, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { BorrowerLoansTable, ActiveLoansTableRow } from 'src/features/market/tables/activeLoans/borrower/BorrowerLoansTable'
import { BorrowerOffersTable } from 'src/features/offers/borrowOffers/BorrowerOffersTable'
import { SplitView } from 'src/components/Views/SplitView'
import { ConnectWalletWarning } from 'src/components/ConnectWallet/ConnectWalletWarning'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { useWallet } from 'src/modules/wallet/useWallet'
import { LoanEntityPreview } from 'src/features/market/tables/activeLoans/LoanEntityPreview'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useRequireWallet } from 'src/hooks/useRequireWallet'
import { BorrowPageTabs } from './BorrowPageTabs'

export function MyLoansPage() {
  const { t } = useTranslation()
  const { isWalletAvailable } = useWallet()
  const requireWallet = useRequireWallet()
  const { open: openRepayLoanModal } = useModals(Modals.Repay)
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.LoansSplit)
  const [loanSelected, setLoanSelected] = useState<ActiveLoansTableRow | null>(null)

  const handleRepay = useCallback((loanSelected: ActiveLoansTableRow) => {
    requireWallet(() => {
      openRepayLoanModal({ loan: loanSelected })
    })
  }, [requireWallet, openRepayLoanModal])

  if (!isWalletAvailable) {
    return (
      <>
        <Helmet>
          <title>{t('page-titles.my-loans')}</title>
        </Helmet>
        <SplitView
          splitPercentage={splitPercentage}
          setSplitPercentage={setSplitPercentage}
          leftHeader={<BorrowPageTabs />}
          leftContent={<ConnectWalletWarning />}
          rightHeader={null}
          rightContent={null}
        />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>{t('page-titles.my-loans')}</title>
      </Helmet>
      <SplitView
        splitPercentage={splitPercentage}
        setSplitPercentage={setSplitPercentage}

        leftHeader={<BorrowPageTabs />}
        leftContent={
          <BorrowerLoansTable
            onRowClick={setLoanSelected}
            onViewOffers={setLoanSelected}
            selectedRow={loanSelected}
          />
        }

        rightHeader={loanSelected && (
          <LoanEntityPreview loan={loanSelected} prioritisedActions={[
            { label: t('borrow.repay'), onClick: () => handleRepay(loanSelected), ...getTestId('borrow.repay') },
          ]} />
        )}
        rightContent={
          loanSelected
            ? <BorrowerOffersTable
              nft={loanSelected.nft}
              loan={loanSelected}
            />
            : null
        }
        closeRightPanel={() => setLoanSelected(null)}
      />
    </>
  )
}
