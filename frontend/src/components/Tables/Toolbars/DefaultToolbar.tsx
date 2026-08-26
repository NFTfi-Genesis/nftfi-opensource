import { ReactNode } from 'react'
import { Stack, Typography } from '@mui/material'
import { GridToolbar } from '@mui/x-data-grid'

interface DefaultToolbarProps {
  title: string
  subtitle?: ReactNode
  showToolbar?: boolean
}

export function DefaultToolbar({
  title,
  subtitle,
  showToolbar = false,
}: DefaultToolbarProps) {

  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Typography variant='h5' padding={2}>
        {title}
      </Typography>
      {subtitle}
      {showToolbar && <GridToolbar />}
    </Stack>
  )
}
