import { Typography } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { AllowanceCheck } from 'src/components/Modal/checks/AllowanceCheck'
import { BalanceCheck } from 'src/components/Modal/checks/BalanceCheck'
import { ChecksProvider } from 'src/components/Modal/checks/ChecksProvider'
import { ChecksContainer } from 'src/components/Modal/common/ChecksContainer'
import { LoanTerms } from 'src/components/Modal/common/LoanTerms'
import { NftHeader } from 'src/components/Modal/common/NftHeader'
import { Wei } from 'src/entities/base/Wei'
import { config } from 'src/config/config'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { PanicError } from 'src/errors/PanicError'
import { Modals } from 'src/modules/modals/Modals'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useLoanExtensionOfferForLoan } from 'src/services/hooks/loanExtension/useLoanExtensionOfferForLoan'
import { AcceptLoanExtensionModalActions } from './AcceptLoanExtensionModalActions'

export type AcceptLoanExtensionModalProps = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export function AcceptLoanExtensionModal({ loan }: AcceptLoanExtensionModalProps) {
  const { t } = useTranslation()
  const { data: offer } = useLoanExtensionOfferForLoan(loan)

  if (!offer) {
    throw new PanicError({ message: 'Active extension offer not found', details: { loanId: loan.loanId, marketLoanId: loan.marketLoanId } })
  }

  return (
    <Modal
      modal={Modals.AcceptLoanExtension}
      title={<><Iconify width={24} icon='ph:clock-clockwise' /> {t('borrow.extension-offer')}</>}
    >
      <NftHeader nft={loan.nft} />
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.current-loan-terms')}
      </Typography>
      <LoanTerms loan={loan} />
      <ChecksProvider>
        {offer.terms.fee > 0n && (
          <ChecksContainer title={t('borrow.extension-authorizations')}>
            <BalanceCheck currency={loan.terms.currency} amount={offer.terms.fee as Wei} />
            <AllowanceCheck
              currency={loan.terms.currency}
              spender={config.ethereum.contracts.nftfi.v3.erc20Manager.address}
              amount={offer.terms.fee as Wei}
              max={true}
            />
          </ChecksContainer>
        )}
        <AcceptLoanExtensionModalActions loan={loan} offer={offer} />
      </ChecksProvider>
    </Modal>
  )
}
