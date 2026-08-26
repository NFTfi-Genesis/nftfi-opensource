import { memo } from 'react'
import { Typography, Box } from '@mui/material'
import { Percentage } from 'src/entities/base/Percentage'
import { formatPercentage } from 'src/utils/numbers'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type PercentageChangeCellProps = {
  percentage: Percentage | null
  change: Percentage | null
}

export const PercentageChangeCell = memo(function PercentageChangeCell({ percentage, change }: PercentageChangeCellProps) {
  const subtextNode
    = change !== null
      ? (
        <Box display='flex' alignItems='center' justifyContent='flex-end'>
          <Typography variant='caption' mt='-2px' fontSize='16px'>
            {change > 0
              ? '\u2191'
              : '\u2193'}
          </Typography>
          <Typography variant='caption'>
            {formatPercentage(Math.abs(change) as Percentage)}
          </Typography>
        </Box>
      )
      : (
        'N/A'
      )

  return (
    <NumberWithSubtextCell
      number={percentage !== null
        ? formatPercentage(percentage)
        : 'N/A'}
      subtext={subtextNode}
    />
  )
})
