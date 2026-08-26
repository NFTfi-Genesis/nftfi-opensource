import { Chip, SxProps, alpha, useTheme } from '@mui/material'
import { memo } from 'react'

export const FilterTag = memo(function FilterTag({
  label,
  onDelete,
  sx,
}: {
  label: string
  onDelete?: () => void
  sx?: SxProps
}) {
  const theme = useTheme()
  return (
    <Chip
      label={label}
      size='small'
      sx={{
        bgcolor: alpha(theme.palette.grey[500], 0.8),
        color: theme.palette.grey[50],
        ...sx,
      }}
      onDelete={onDelete}
    />
  )
})
