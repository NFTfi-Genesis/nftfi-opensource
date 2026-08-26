import { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { getTestId } from 'src/utils/testing'
import { useChecks } from '../checks/ChecksProvider'

export type ChecksContainerProps = {
  title: string
  children: ReactNode
}

export function ChecksContainer({ title, children }: ChecksContainerProps) {
  const { shouldHideChecks } = useChecks()

  return (
    <Stack
      gap={1}
      sx={{
        visibility: shouldHideChecks
          ? 'hidden'
          : 'visible',
        height: shouldHideChecks
          ? 0
          : 'auto',
        overflow: 'hidden',
      }}
    >
      <Typography variant='subtitle1' sx={{ pt: 3 }}>
        { title }
        <Typography component='span' color='error.main'>
          {' *'}
        </Typography>
      </Typography>
      <Box
        {...getTestId('modal.checks.container')}
        display='grid' gridTemplateColumns='1fr 1fr' rowGap={1} columnGap={2} sx={{ overflow: 'visible', pt: 0.5, pr: 0.5 }}>
        {children}
      </Box>
    </Stack>
  )
}
