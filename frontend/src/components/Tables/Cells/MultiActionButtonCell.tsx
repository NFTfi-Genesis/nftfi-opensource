import { memo, useMemo } from 'react'
import { Stack } from '@mui/material'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import {
  MultiActionButton,
  type MultiActionButtonAction,
} from 'src/components/MultiActionButton/MultiActionButton'

export type MultiActionButtonCellProps = {
  prioritisedActions: MultiActionButtonAction[]
  align?: 'left' | 'right' | 'center'
  isMinimised?: boolean
}

export const MultiActionButtonCell = memo(function MultiActionButtonCell({
  prioritisedActions,
  align = 'right',
  isMinimised = false,
}: MultiActionButtonCellProps) {
  const density = useTableDensity()
  const height = density === 'compact'
    ? 30
    : 36

  const buttonSx = useMemo(() => ({
    height,
    // Apply hover styles when row is hovered or selected
    '.MuiDataGrid-row:hover &, .MuiDataGrid-row.Mui-selected &': {
      backgroundColor: 'primary.main',
      color: 'grey.50',
    },
    // Add active state for click down feedback with higher specificity
    '&:active, .MuiDataGrid-row &:active': {
      backgroundColor: 'primary.dark',
      color: 'grey.50',
    },
  }), [height])

  return (
    <Stack
      height='100%'
      justifyContent='center'
      alignItems={align === 'left'
        ? 'flex-start'
        : align === 'center'
          ? 'center'
          : 'flex-end'}
      px='2'
      className='apply-sticky-right-cell'
    >
      <MultiActionButton
        prioritisedActions={prioritisedActions}
        sx={buttonSx}
        isMinimised={isMinimised}
      />
    </Stack>
  )
})
