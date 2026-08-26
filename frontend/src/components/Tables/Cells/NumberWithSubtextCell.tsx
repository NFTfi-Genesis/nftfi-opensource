import { memo } from 'react'
import { Stack, Typography, Tooltip } from '@mui/material'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TKey } from 'src/modules/translation/TKey'

export type NumberWithSubtextCellProps = {
  number: string | number
  subtext: React.ReactNode
  tooltip?: TKey
}

export const NumberWithSubtextCell = memo(function NumberWithSubtextCell({
  number,
  subtext,
  tooltip,
}: NumberWithSubtextCellProps) {
  const density = useTableDensity()
  const { t } = useTranslation()

  const content = (
    <Stack height='100%' justifyContent='center'>
      <Typography variant='mono1'>{number}</Typography>
      <Typography
        variant='caption'
        textTransform='capitalize'
        mt={density === 'compact'
          ? -0.625
          : density === 'standard'
            ? 0.5
            : 1}
      >
        {subtext}
      </Typography>
    </Stack>
  )

  if (tooltip) {
    return (
      <Tooltip
        title={t(tooltip)}
        placement='top'
        slotProps={{
          popper: {
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [-80, -20],
                },
              },
            ],
          },
          tooltip: {
            sx: {
              width: '200px',
            },
          },
        }}
      >
        {content}
      </Tooltip>
    )
  }

  return content
})
