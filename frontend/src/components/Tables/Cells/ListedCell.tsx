import { memo } from 'react'
import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'

export type ListingStatusCellProps = {
  isListed: boolean
}

export const ListingStatusCell = memo(function ListingStatusCell({
  isListed,
}: ListingStatusCellProps) {
  const { t } = useTranslation()

  const text = isListed
    ? t('borrow.listed')
    : t('borrow.unlisted')

  return (
    <Stack height='100%' justifyContent='center'>
      <Typography variant='mono1'>
        {text}
      </Typography>
    </Stack>
  )
})
