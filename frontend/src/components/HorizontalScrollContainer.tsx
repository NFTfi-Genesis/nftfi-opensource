import { ReactNode, useState, useRef, useEffect, forwardRef, Ref } from 'react'
import { Stack, Box, SxProps, Theme } from '@mui/material'

type HorizontalScrollContainerProps = {
  children: ReactNode
  backgroundColor?: string
  fadeColor?: string
  sx?: SxProps<Theme>
}

export const HorizontalScrollContainer = forwardRef(function HorizontalScrollContainer(
  {
    children,
    backgroundColor = 'customPallette.nftfi.pageBackground',
    fadeColor = '#0F0E1A',
    sx = {}
  }: HorizontalScrollContainerProps,
  ref: Ref<HTMLDivElement>
) {
  const internalScrollRef = useRef<HTMLDivElement>(null)
  const scrollRef = (ref as React.RefObject<HTMLDivElement>) || internalScrollRef
  const [showScrollbar, setShowScrollbar] = useState(true)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const scrollbarTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  function updateFadeVisibility() {
    const element = scrollRef.current
    if (!element) return

    const { scrollLeft, scrollWidth, clientWidth } = element
    const canScrollLeft = scrollLeft > 0
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1 // -1 for rounding errors

    setShowLeftFade(canScrollLeft)
    setShowRightFade(canScrollRight)
  }

  function resetScrollbarTimeout() {
    setShowScrollbar(true)
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current)
    }
    scrollbarTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false)
    }, 1500)
  }

  function handleScrollInteraction() {
    updateFadeVisibility()
    resetScrollbarTimeout()
  }

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    updateFadeVisibility()
    resetScrollbarTimeout()

    element.addEventListener('scroll', handleScrollInteraction)
    element.addEventListener('mouseenter', resetScrollbarTimeout)
    element.addEventListener('mouseleave', resetScrollbarTimeout)
    const resizeObserver = new ResizeObserver(updateFadeVisibility)
    resizeObserver.observe(element)

    return () => {
      element.removeEventListener('scroll', handleScrollInteraction)
      element.removeEventListener('mouseenter', resetScrollbarTimeout)
      element.removeEventListener('mouseleave', resetScrollbarTimeout)
      resizeObserver.disconnect()
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const leftGradient = `linear-gradient(270deg, rgba(15, 14, 26, 0.00) 0%, ${fadeColor} 100%)`
  const rightGradient = `linear-gradient(90deg, rgba(15, 14, 26, 0.00) 0%, ${fadeColor} 100%)`

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%'
      }}>
      <Stack
        ref={scrollRef}
        direction='row'
        alignItems='center'
        gap={3}
        sx={{
          overflowX: 'scroll',
          overflowY: 'hidden',
          flexWrap: 'nowrap',
          backgroundColor,
          borderRadius: '8px',
          py: '6px',
          paddingX: 2,
          width: '100%',
          // Webkit scrollbar styling with opacity transition
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme => theme.palette.customPallette.nftfi.scrollbarThumb,
            borderRadius: '4px',
            opacity: showScrollbar
              ? 1
              : 0,
            transition: 'opacity 0.3s ease-in-out',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
          // Firefox scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: theme => showScrollbar
            ? `${theme.palette.customPallette.nftfi.scrollbarThumb} transparent`
            : 'transparent transparent',
          transition: 'scrollbar-color 0.3s ease-in-out',
          ...sx,
        }}>
        {children}
      </Stack>
      {showLeftFade && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '32px',
            background: leftGradient,
            pointerEvents: 'none',
            borderRadius: '8px 0 0 8px',
            zIndex: 1,
          }}
        />
      )}
      {showRightFade && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '32px',
            background: rightGradient,
            pointerEvents: 'none',
            borderRadius: '0 8px 8px 0',
            zIndex: 1,
          }}
        />
      )}
    </Box>
  )
})
