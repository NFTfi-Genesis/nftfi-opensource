import { memo, useMemo } from 'react'
import { Box, Button, Stack } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { TKey } from 'src/modules/translation/TKey'
import { TooltipBase } from 'src/components/TooltipBase'

export type ActionButtonCellProps<TRowData = unknown> = {
  onClick: (rowData: TRowData) => void
  rowData: TRowData
  buttonCopyTranslationKey: TKey
  show?: boolean
  disabled?: boolean
  tooltipCopy?: TKey
}

export const ActionButtonCell = memo(function ActionButtonCell<TRowData = unknown>({
  onClick,
  rowData,
  buttonCopyTranslationKey,
  show = true,
  disabled = false,
  tooltipCopy,
}: ActionButtonCellProps<TRowData>) {
  const density = useTableDensity()
  const height = density === 'compact'
    ? 30
    : 36
  const { t } = useTranslation()

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

  if (!show) {
    return null
  }

  const button = (
    <Button
      variant='link'
      onClick={() => onClick(rowData)}
      sx={!disabled
        ? buttonSx
        : {}}
      disabled={disabled}
    >
      {t(buttonCopyTranslationKey)}
    </Button>
  )

  return (
    <Stack
      height='100%'
      justifyContent='center'
      px='2'
      className='apply-sticky-right-cell'
    >
      {tooltipCopy
        ? (
          <TooltipBase title={t(tooltipCopy)}>
            <Box display='flex' justifyContent='center'>{button}</Box>
          </TooltipBase>
        )
        : (
          button
        )}
    </Stack>
  )
})
