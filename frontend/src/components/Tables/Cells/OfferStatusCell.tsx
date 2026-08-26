import { useMemo } from 'react'
import { Stack, Tooltip, Typography } from '@mui/material'
import { OfferStatus } from 'src/entities/domain/Offer'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { OfferExtended } from 'src/entities/app/OfferExtended'
import { OfferValidated } from 'src/entities/app/OfferValidated'

export type OfferStatusCellProps = {
  offer: OfferExtended<OfferValidated>
}

export function OfferStatusCell({ offer }: OfferStatusCellProps) {
  const { t } = useTranslation()

  const invalidReason = offer.status === OfferStatus.Invalid
    ? offer.invalidReason
    : null

  const mainText = useMemo(() => {
    if (offer.isDeleted) {
      return t('custom-table-columns.offer-status-deleted')
    }
    if (offer.status === OfferStatus.Active) {
      return t('custom-table-columns.offer-status-active')
    }
    else if (offer.status === OfferStatus.Invalid) {
      // Show "Underfunded" instead of "Invalid" when insufficient balance is the reason
      if (invalidReason?.insufficientBalance) {
        return t('custom-table-columns.offer-status-underfunded')
      }
      return t('custom-table-columns.offer-status-invalid')
    }
    else {
      return t('custom-table-columns.offer-status-unknown')
    }
  }, [offer.status, offer.isDeleted, invalidReason?.insufficientBalance, t])

  const subText = useMemo(() => {
    if (offer.isDeleted && offer.status === OfferStatus.Invalid) {
      // Show "Underfunded" instead of "Invalid" when insufficient balance is the reason
      if (invalidReason?.insufficientBalance) {
        return t('custom-table-columns.offer-status-underfunded')
      }
      return t('custom-table-columns.offer-status-invalid')
    }
    return null
  }, [offer.isDeleted, offer.status, invalidReason?.insufficientBalance, t])

  const invalidReasonText = useMemo(() => {
    if (offer.status === OfferStatus.Invalid) {
      if (invalidReason?.insufficientBalance) {
        return t('custom-table-columns.offer-status-invalid-reason-insufficient-balance')
      }
      else if (invalidReason?.insufficientAllowance) {
        return t('custom-table-columns.offer-status-invalid-reason-insufficient-allowance')
      }
      else if (invalidReason?.invalidNonce) {
        return t('custom-table-columns.offer-status-invalid-reason-invalid-nonce')
      }
      else if (invalidReason?.exceedsMaxDuration) {
        return t('custom-table-columns.offer-status-invalid-reason-exceeds-max-duration')
      }
    }
    return null
  }, [
    offer.status,
    invalidReason?.insufficientBalance,
    invalidReason?.insufficientAllowance,
    invalidReason?.invalidNonce,
    invalidReason?.exceedsMaxDuration,
    t,
  ])

  const content = (
    <Stack height='100%' justifyContent='center' direction='column'>
      <Typography
        variant={'captionMono'}
        fontSize={14}>
        {mainText}
      </Typography>
      {subText && <Typography
        variant='captionMono'
        sx={{ color: theme => theme.palette.text.secondary }}
      >
        {subText}
      </Typography>}
    </Stack>
  )

  if (invalidReasonText) {
    return (
      <Tooltip
        title={invalidReasonText}
        placement='top'
      >
        {content}
      </Tooltip>
    )
  }

  return content
}
