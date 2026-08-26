import { memo } from 'react'
import { Stack, Typography } from '@mui/material'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { useTranslation } from 'src/modules/translation/useTranslation'

export type LoanOffersCellProps = {
  count: number
}

export const LoanOffersCell = memo(function LoanOffersCell({
  count,
}: LoanOffersCellProps) {
  const density = useTableDensity()
  const { t } = useTranslation()

  const offerText = count === 1
    ? t('borrow.offer')
    : t('borrow.offers')

  return (
    <Stack height='100%' justifyContent='center'>
      <Typography variant='mono1'>{count}</Typography>
      <Typography
        variant='caption'
        mt={density === 'compact'
          ? -0.625
          : density === 'standard'
            ? 0.5
            : 1}
      >
        {offerText}
      </Typography>
    </Stack>
  )
})
