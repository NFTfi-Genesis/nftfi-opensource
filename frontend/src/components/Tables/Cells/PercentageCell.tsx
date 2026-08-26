import { memo } from 'react'
import { Box, useTheme } from '@mui/material'
import { Percentage } from 'src/entities/base/Percentage'
import { formatPercentage } from 'src/utils/numbers'
import { NumberWithSubtextCell } from './NumberWithSubtextCell'

export type PercentageCellProps = {
  percentage: Percentage
  standoutStyle?: boolean
}

export const PercentageCell = memo(function PercentageCell({
  percentage,
  standoutStyle,
}: PercentageCellProps) {
  const theme = useTheme()

  if (!standoutStyle) {
    return (
      <NumberWithSubtextCell
        number={formatPercentage(percentage)}
        subtext='%'
      />
    )
  }

  return (
    <Box sx={{
      '& .MuiTypography-root':
        {
          color: 'inherit',
          fontWeight: 700,
        },
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      fontWeight: 700,
      width: 'fit-content',
      borderRadius: 1,
      py: 0.2,
      px: 0.7,
      justifySelf: 'flex-end',
      marginRight: -0.7,
    }}>
      <NumberWithSubtextCell
        number={formatPercentage(percentage)}
        subtext='%'
      />
    </Box>
  )
})
