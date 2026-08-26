import { Typography } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { Modal } from 'src/components/Modal/Modal'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Modals } from 'src/modules/modals/Modals'
import { LoanTerms } from '../common/LoanTerms'
import { NftHeader } from '../common/NftHeader'
import { LiquidateLoanModalActions } from './LiquidateModalActions'

export type LiquidateLoanModalProps = {
  loan: LoanExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>
}

export const LiquidateLoanModal = function LiquidateLoanModal(
  { loan }: LiquidateLoanModalProps,
) {
  const { t } = useTranslation()

  return (
    <Modal
      modal={Modals.Liquidate}
      title={
        <>
          <Iconify width={24} icon='ph:arrow-up-right' /> {t('borrow.foreclose-loan')}
        </>
      }
    >
      <NftHeader nft={loan.nft} />
      <Typography variant='subtitle1' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.loan-terms')}
      </Typography>
      <LoanTerms loan={loan} />
      <LiquidateLoanModalActions loan={loan} />
    </Modal>
  )
}
