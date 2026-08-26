import { memo, forwardRef } from 'react'
import { Box } from '@mui/material'
import { ScrollbarProps } from './types'
import { StyledScrollbar, StyledRootScrollbar } from './styles'

export const Scrollbar = memo(forwardRef<HTMLDivElement, ScrollbarProps>(
  ({ children, sx, ...other }, ref) => {
    const userAgent
      = typeof navigator === 'undefined'
        ? 'SSR'
        : navigator.userAgent

    const mobile
      = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      )

    if (mobile) {
      return (
        <Box
          ref={ref}
          sx={{
            overflow: 'auto',
            ...sx,
            height: '100%',
            '& .simplebar-wrapper': { height: '100%' },
            '& .simplebar-content-wrapper': { height: '100%' },
            '& .simplebar-content': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          {...other}
        >
          {children}
        </Box>
      )
    }

    return (
      <StyledRootScrollbar>
        <StyledScrollbar
          scrollableNodeProps={{
            ref,
          }}
          clickOnTrack={false}
          sx={{
            ...sx,
            height: '100%',
            '& .simplebar-wrapper': { height: '100%' },
            '& .simplebar-content-wrapper': { height: '100%' },
            '& .simplebar-content': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          {...other}
        >
          {children}
        </StyledScrollbar>
      </StyledRootScrollbar>
    )
  }
))
