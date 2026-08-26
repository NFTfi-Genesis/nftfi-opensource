import { memo } from 'react'
import { SxProps, Typography } from '@mui/material'

export const FormElementLabel = memo(function FormElementLabel({ label, sx }: { label: string, sx?: SxProps }) {
  return <Typography
    sx={{
      color: theme => theme.palette.text.secondary,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: '12px',
      mb: '6px',
      ...sx,
    }}
  >
    {label}
  </Typography>
})
