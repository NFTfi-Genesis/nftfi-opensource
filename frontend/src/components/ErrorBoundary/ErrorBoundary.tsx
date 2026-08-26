import { Component } from 'react'
import { Box, Typography, Button, Stack } from '@mui/material'

import CalloutBubble from 'src/assets/images/svg/callout-bubble.svg'
import { Iconify } from 'src/components/Iconify'
import { createErrorHandler, silentErrorHandler } from 'src/utils/errors'

export type ErrorBoundaryProps = {
  children: React.ReactNode
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  {
    hasError: boolean
  }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    (error as Error & { errorInfo: React.ErrorInfo }).errorInfo = errorInfo
    createErrorHandler(silentErrorHandler)(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#161C24',
            color: 'text.primary',
          }}
        >
          <Stack alignItems='center' gap={1}>
            <Box sx={{ position: 'relative' }}>
              <Typography
                color='#161C24'
                fontSize={84}
                fontWeight={800}
                fontFamily={'Public Sans'}
                lineHeight={1.2}
                sx={{
                  position: 'absolute',
                  top: 13,
                  left: 60,
                }}
              >
                Oops!
              </Typography>
              <CalloutBubble width={358} />
            </Box>
            <Typography
              color='white'
              fontSize={32}
              fontWeight={700}
              fontFamily={'Public Sans'}
            >
              Something went wrong
            </Typography>
            <Button
              href='https://app.nftfi.com'
              variant='contained'
              startIcon={<Iconify icon='ph:arrow-bend-up-left' width={24} />}
              disableRipple
              fullWidth
              size='large'
              sx={{
                height: 48,
                marginTop: 6,
                fontFamily: 'Public Sans',
                bgcolor: '#CB2B83',
                color: 'white',
                textTransform: 'none',
                gap: 1,
                borderRadius: '8px',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#CB2B83',
                  boxShadow: 'none',
                },
                '&:active': {
                  bgcolor: '#CB2B83',
                  boxShadow: 'none',
                },
              }}
            >
              <Typography fontWeight={700} fontSize={15}>
                Home
              </Typography>
            </Button>
          </Stack>
        </Box>
      )
    }
    return this.props.children
  }
}
