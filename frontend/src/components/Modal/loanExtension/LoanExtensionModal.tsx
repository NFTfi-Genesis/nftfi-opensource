import { useEffect, useState } from 'react'
import { CircularProgress, Stack, Typography } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { ChecksProvider } from 'src/components/Modal/checks/ChecksProvider'
import { LoginCheck } from 'src/components/Modal/checks/LoginCheck'
import { ChecksContainer } from 'src/components/Modal/common/ChecksContainer'
import { LoanTerms } from 'src/components/Modal/common/LoanTerms'
import { NftHeader } from 'src/components/Modal/common/NftHeader'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { Modals } from 'src/modules/modals/Modals'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useLoanExtensionOfferForLoan } from 'src/services/hooks/loanExtension/useLoanExtensionOfferForLoan'
import { MakeLoanExtensionModalActions } from './MakeLoanExtensionModalActions'
import { UpdateLoanExtensionModalActions } from './UpdateLoanExtensionModalActions'

export type LoanExtensionModalProps = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export function LoanExtensionModal({ loan }: LoanExtensionModalProps) {
  const { t } = useTranslation()
  const { data: activeOffer, isLoading } = useLoanExtensionOfferForLoan(loan)
  const [showReplaceForm, setShowReplaceForm] = useState(false)

  useEffect(() => {
    setShowReplaceForm(false)
  }, [activeOffer?.signature])

  return (
    <Modal
      modal={Modals.LoanExtension}
      title={<><Iconify width={24} icon='ph:clock-clockwise' /> {t('lend.extend-loan')}</>}
    >
      <NftHeader nft={loan.nft} />
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('lend.current-loan-terms')}
      </Typography>
      <LoanTerms loan={loan} />
      <ChecksProvider>
        <ChecksContainer title={t('lend.extension-authorizations')}>
          <LoginCheck nft={loan.nft} />
        </ChecksContainer>
        {isLoading
          ? (
            <Stack alignItems='center' sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          )
          : activeOffer && !showReplaceForm
            ? (
              <UpdateLoanExtensionModalActions
                loan={loan}
                offer={activeOffer}
                onReplace={() => setShowReplaceForm(true)}
              />
            )
            : <MakeLoanExtensionModalActions loan={loan} />}
      </ChecksProvider>
    </Modal>
  )
}
