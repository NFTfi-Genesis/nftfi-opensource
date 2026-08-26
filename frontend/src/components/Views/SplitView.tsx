import { createContext, Dispatch, SetStateAction, useCallback, useRef } from 'react'
import { Box, Stack } from '@mui/material'
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { Panel } from '../Panel'

type SplitViewContextType = {
  closeRightPanel?: () => void
}

export const SplitViewContext = createContext<SplitViewContextType>({
  closeRightPanel: () => {},
})

export type SplitViewProps = {
  splitPercentage: number
  setSplitPercentage: Dispatch<SetStateAction<number>>
  leftContent: React.ReactNode
  closeRightPanel?: () => void
  leftHeader?: React.ReactNode
  leftMinWidthPct?: number
  rightContent: React.ReactNode
  rightHeader?: React.ReactNode
  rightMinWidthPct?: number
  showSidePanel?: boolean
}

export function SplitView({
  splitPercentage,
  setSplitPercentage,
  leftHeader,
  leftContent,
  leftMinWidthPct = 35,
  rightContent,
  rightHeader,
  rightMinWidthPct = 35,
  showSidePanel = false,
  closeRightPanel,
}: SplitViewProps) {
  const showRight = Boolean(rightContent)
  const { isMobileOrLaptopView } = useBreakpoints()

  // Ref to outer flex container to know its width
  const containerRef = useRef<HTMLDivElement | null>(null)
  const headersHeight = '74px'
  const splitPaddingX = 0
  const splitPaddingY = 0

  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    if (!containerRef.current) return
    const width = containerRef.current.offsetWidth
    if (!width) return

    setSplitPercentage(prev => {
      const deltaPercent = (data.deltaX / width) * 100
      const next = prev + deltaPercent
      const minSplit = leftMinWidthPct ?? 0
      const maxSplit = rightMinWidthPct !== undefined
        ? 100 - rightMinWidthPct
        : 100
      return Math.min(maxSplit, Math.max(minSplit, next))
    })
  },
  [setSplitPercentage, leftMinWidthPct, rightMinWidthPct])

  const leftFlex = showRight
    ? `0 0 ${splitPercentage}%`
    : '1 1 auto'
  const rightFlex = `0 0 ${100 - splitPercentage}%`

  return (
    <SplitViewContext.Provider value={{ closeRightPanel }}>
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden', // Prevent container from growing beyond available space
        }}
      >
        {/* LEFT PANEL */}
        <Box
          sx={{
            flex: leftFlex,
            minWidth: 0, // Allow flex item to shrink below content size
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // Prevent outer container from scrolling
            maxWidth: isMobileOrLaptopView && showRight
              ? '0'
              : '100%',
          }}
        >
          <Panel fullWidth fullHeight straightRightEdge={showRight || showSidePanel}
            sx={{
              paddingX: splitPaddingX,
              paddingY: splitPaddingY,
            }}
          >
            <Stack
              direction='column'
              sx={{
                height: '100%',
                overflow: 'hidden', // Prevent Stack from scrolling
              }}
            >
              {leftHeader
              && <Stack
                direction='row'
                alignItems='center'
                sx={{
                  flexShrink: 0, // Prevent header from shrinking
                  overflow: 'hidden', // Prevent header from moving when content overflows
                  minWidth: 0, // Allow flex item to shrink below content size
                }}
              >
                <Box
                  flexGrow={1}
                  height={headersHeight}
                  alignContent='center'
                  sx={{
                    overflow: 'hidden', // Prevent header content from causing horizontal scroll
                    minWidth: 0, // Allow flex item to shrink below content size
                  }}
                >
                  {leftHeader}
                </Box>
              </Stack>}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0, // Allow flex item to shrink below content size
                  overflow: 'auto', // Enable scrollbars only for content area
                }}
              >
                {leftContent}
              </Box>
            </Stack>
          </Panel>
        </Box>

        {/* DRAG HANDLE */}
        {showRight && !isMobileOrLaptopView && (
          <Draggable
            axis='x'
            // We don't use Draggable's position to move the element;
            // layout is driven by flex widths. We just use drag deltas.
            position={{ x: 0, y: 0 }}
            onDrag={handleDrag}
          >
            <Box
              sx={{
                width: '10px',
                height: '100%',
                cursor: 'col-resize',
                // invisible handle – same bg or transparent
                backgroundColor: 'transparent',
                // allow handle to be hit by pointer
                flex: '0 0 auto',
              }}
            />
          </Draggable>
        )}

        {/* RIGHT PANEL */}
        {showRight && (
          <Box
            sx={{
              flex: rightFlex,
              minWidth: isMobileOrLaptopView
                ? '100%'
                : 0, // Allow flex item to shrink below content size
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden', // Prevent outer container from scrolling
              paddingRight: isMobileOrLaptopView
                ? 0
                : 1, // Add padding to prevent clipping of rounded corners
            }}
          >
            <Panel fullWidth fullHeight straightLeftEdge={!isMobileOrLaptopView}
              sx={{
                paddingX: splitPaddingX,
                paddingY: splitPaddingY,
              }}
            >
              <Stack
                direction='column'
                sx={{
                  height: '100%',
                  overflow: 'hidden', // Prevent Stack from scrolling
                }}
              >
                {rightHeader
              && <Stack
                direction='row'
                alignItems={isMobileOrLaptopView
                  ? 'flex-start'
                  : 'center'}
                gap={1.5}
                padding={isMobileOrLaptopView
                  ? '12px'
                  : 0
                }
                sx={{
                  flexShrink: 0, // Prevent header from shrinking
                  overflow: 'hidden', // Prevent header from moving when content overflows
                  minWidth: 0, // Allow flex item to shrink below content size
                }}
              >
                <Box
                  flexGrow={1}
                  height={isMobileOrLaptopView
                    ? 'auto'
                    : headersHeight}
                  alignContent='center'
                  sx={{
                    overflow: 'hidden', // Prevent header content from causing horizontal scroll
                    minWidth: 0, // Allow flex item to shrink below content size
                  }}
                >
                  {rightHeader}
                </Box>
              </Stack>}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0, // Allow flex item to shrink below content size
                    overflow: 'auto', // Enable scrollbars only for content area
                  }}
                >
                  {rightContent}
                </Box>
              </Stack>
            </Panel>
          </Box>
        )}
      </Box>
    </SplitViewContext.Provider>
  )
}
