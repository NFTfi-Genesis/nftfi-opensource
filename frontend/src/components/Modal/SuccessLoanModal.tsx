import { ReactNode } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { Offer } from 'src/entities/domain/Offer'
import { Modal } from 'src/components/Modal/Modal'
import { Iconify } from 'src/components/Iconify'
import { Wei } from 'src/entities/base/Wei'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'
import { AddCalendarReminderButton } from './common/AddCalendarReminderButton'
import { NftHeader } from './common/NftHeader'
import { TermRow } from './common/TermRow'
import { OfferTerms } from './common/OfferTerms'

export type SuccessLoanModalProps = {
  title: ReactNode
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  refiProceed?: Wei
  offer: Offer
}

export const SuccessLoanModal = function SuccessLoanModal(
  { title, nft, refiProceed, offer }: SuccessLoanModalProps,
) {
  const { t } = useTranslation()
  const { close: closeSuccessLoanModal } = useModals(Modals.SuccessLoan)

  return (
    <Modal modal={Modals.SuccessLoan} title={title}>
      <NftHeader nft={nft} />
      <Typography variant='subtitle2' sx={{ pt: 3, pb: 1 }}>
        {t('borrow.loan-terms')}
      </Typography>
      <Stack gap={2}>
        <OfferTerms offer={offer} />
        {refiProceed !== undefined && (
          <TermRow label={t('borrow.received-on-refinance')}>
            <Typography variant='mono1' color='text.primary'>
              {formatWei(refiProceed, offer.terms.currency)}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
              {getCurrencyTicker(offer.terms.currency)}
            </Typography>
          </TermRow>
        )}
      </Stack>
      <Stack gap={2} sx={{ pt: 2 }}>
        <Stack direction='row' gap={2} sx={{ width: '100%' }}>
          <Button
            variant='outlined'
            component={Link}
            to='/borrow/my-loans'
            startIcon={<Iconify icon='ph:arrow-left' width={20} />}
            sx={{ flex: 1 }}
            onClick={closeSuccessLoanModal}
          >
            {t('borrow.view-loan')}
          </Button>
          {offer && <AddCalendarReminderButton nft={nft} offer={offer} />}
        </Stack>
      </Stack>
    </Modal>
  )
}
