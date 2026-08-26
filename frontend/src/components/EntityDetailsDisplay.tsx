import { ReactNode, useMemo, useState } from 'react'
import { Typography, Box, Stack, Tooltip } from '@mui/material'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { Iconify } from './Iconify'
import { HorizontalScrollContainer } from './HorizontalScrollContainer'

export type EntityDetailsItem = {
  title: string
  content: string | ReactNode
  change?: {
    direction: 'up' | 'down' | 'none'
    content: string
  }
}

export function EntityDetailsDisplay({ terms }: { terms?: EntityDetailsItem[] }) {
  const { isMobileView } = useBreakpoints()
  const [open, setOpen] = useState(false)

  const termsBlocks = useMemo(() => terms?.map(term => (
    <Stack key={term.title} direction='column' gap={0.5} sx={{ flexShrink: 0 }}>
      <Typography color='text.secondary' fontWeight={600} fontSize={12}>{term.title}</Typography>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
        }}>
        <Typography variant='mono4' fontWeight={300}>
          {term.content}
        </Typography>
        {term.change && (
          <>
            {term.change.direction !== 'none' && (
              <Iconify
                icon={
                  term.change.direction === 'up'
                    ? 'ph:arrow-up'
                    : 'ph:arrow-down'
                }
                width={18}
                sx={{ color: 'text.secondary' }}
              />
            )}
            {term.change?.content && <Typography
              variant='mono4'
              fontWeight={400}
              sx={{
                color: 'text.secondary',
                fontSize: '14px',
                alignSelf: 'flex-start',
              }}>
              {term.change.content}
            </Typography>}
          </>
        )}
      </Box>
    </Stack>
  )), [terms])

  if (!terms || terms?.length === 0) {
    return null
  }

  return (
    <Tooltip
      title={
        isMobileView
          ? <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 2 }}>{termsBlocks}</Box>
          : <Stack direction='row' flexWrap='wrap' gap={3} useFlexGap>{termsBlocks}</Stack>
      }
      placement='bottom-start'
      open={open}
      disableFocusListener
      disableHoverListener
      disableTouchListener
      slotProps={{
        tooltip: { sx: { maxWidth: '95vw', width: 'fit-content' } },
      }}
    >
      <Box
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(prev => !prev)}
      >
        <HorizontalScrollContainer backgroundColor='customPallette.nftfi.pageBackground'>
          {termsBlocks}
        </HorizontalScrollContainer>
      </Box>
    </Tooltip>
  )
}
