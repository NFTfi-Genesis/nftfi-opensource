import { Box, Stack, Typography } from '@mui/material'
import { ReactNode } from 'react'

type TermRowProps = {
  label: ReactNode
  children: ReactNode
}

export function TermRow({ label, children }: TermRowProps) {
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
        {typeof label === 'string'
          ? (
            <Typography variant='body1' color='text.secondary'>
              {label}
            </Typography>
          )
          : (
            label
          )}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>{children}</Box>
    </Stack>
  )
}
