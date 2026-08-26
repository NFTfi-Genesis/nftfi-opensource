import { Box, Collapse, IconButton, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Panel } from 'src/components/Panel'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { Iconify } from '../Iconify'

const SIDE_PANEL_ANIMATION_DURATION = 0.3
const SIDE_PANEL_COLLAPSED_WIDTH_PX = 215
const SIDE_PANEL_EXPANDED_WIDTH_PX = 358

export type SidePanelViewProps = {
  children: React.ReactNode
  header?: React.ReactNode
  showSidePanel: boolean
  sidePanelExpanded: boolean
  setSidePanelExpanded: (expanded: boolean) => void
  sidePanel: React.ReactNode
  noBackground?: boolean
}

export function SidePanelView({
  children,
  header,
  showSidePanel,
  sidePanelExpanded,
  setSidePanelExpanded,
  sidePanel,
  noBackground = false,
}: SidePanelViewProps) {
  const { isLaptopOrDesktopView } = useBreakpoints()
  const theme = useTheme()
  const sidePanelWidthPx = sidePanelExpanded
    ? SIDE_PANEL_EXPANDED_WIDTH_PX
    : SIDE_PANEL_COLLAPSED_WIDTH_PX

  const panelContent = header
    ? (
      <Stack
        direction='column'
        sx={{
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
          }}
        >
          {header}
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Stack>
    )
    : children

  return (
    <Stack direction='row' height='100%' flex={1} minWidth={0}>
      {/* Main content */}
      <Panel
        fullHeight
        straightRightEdge={showSidePanel}
        sx={{
          flex: 1,
          minWidth: 0,
          padding: 0,
          ...(noBackground && { backgroundColor: 'transparent' }),
        }}
      >
        {panelContent}
      </Panel>

      {/* Toggle button for side panel - only visible on desktop */}
      {isLaptopOrDesktopView
        && showSidePanel && (
        <Box
          sx={{
            marginTop: '52px',
            marginRight: -3,
            zIndex: 1000,
            transform: 'translateX(-20%)',
          }}
        >
          <IconButton
            onClick={() => setSidePanelExpanded(!sidePanelExpanded)}
            sx={{
              backgroundColor: theme.palette.customPallette.nftfi.paper,
              border: `1px solid ${theme.palette.divider}`,
              width: '24px',
              height: '24px',
              padding: '3px',
              '&:hover': {
                background: theme.palette.customPallette.nftfi.rowDivider,
              },
            }}
            size='small'
          >
            <Iconify
              icon={
                sidePanelExpanded
                  ? 'ph:caret-right-bold'
                  : 'ph:caret-left-bold'
              }
            />
          </IconButton>
        </Box>
      )}
      {/* Side panel - only visible on desktop */}
      <Collapse
        in={isLaptopOrDesktopView && showSidePanel}
        orientation='horizontal'
        unmountOnExit
        timeout={SIDE_PANEL_ANIMATION_DURATION * 1000}
      >
        <Box
          sx={{
            width: `${sidePanelWidthPx}px`,
            height: '100%',
            transition: `width ${SIDE_PANEL_ANIMATION_DURATION}s ease, margin ${SIDE_PANEL_ANIMATION_DURATION}s ease`,
            position: 'relative',
            display: 'flex',
            // paddingY: 3,
            // paddingRight: !drawerIsPinned ? `${SIDE_PANEL_PADDING_RIGHT_PX}px` : 0,
            paddingLeft: 1,
            margin: 0,
            flexShrink: 0,
          }}
        >
          <Panel fullWidth fullHeight straightLeftEdge>
            {sidePanel}
          </Panel>
        </Box>
      </Collapse>

      {/* TODO: Add mobile side panel drawer here */}
    </Stack>
  )
}
