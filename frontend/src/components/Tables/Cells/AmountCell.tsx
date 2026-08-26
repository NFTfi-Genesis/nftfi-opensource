import { memo } from 'react'
import { Stack, Typography, Tooltip } from '@mui/material'
import { getTestId } from 'src/utils/testing'
import { getCurrencyTicker } from 'src/utils/currencies'
import { AmountDisplay, AmountDisplayProps } from 'src/components/AmountDisplay'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TKey } from 'src/modules/translation/TKey'

export type AmountCellProps = AmountDisplayProps & { tooltip?: TKey }

export const AmountCell = memo(function AmountCell(props: AmountCellProps) {
  const { currency, tooltip } = props
  const density = useTableDensity()
  const { t } = useTranslation()
  if (!currency) {
    // TODO: Report to Sentry
    return null
  }

  const content = (
    <Stack height='100%' justifyContent='center'>
      <AmountDisplay {...props} />
      <Typography
        variant='caption'
        mt={density === 'compact'
          ? -0.75
          : density === 'standard'
            ? 0.5
            : 1}
        color='text.secondary'
        {...getTestId('amount.currency', currency.toLowerCase())}
      >
        {getCurrencyTicker(currency)}
      </Typography>
    </Stack>
  )

  return tooltip
    ? (
      <Tooltip
        title={t(tooltip)}
        slotProps={{
          popper: {
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [30, -35],
                },
              },
            ],
          },
        }}
      >
        {content}
      </Tooltip>
    )
    : (
      content
    )
})
