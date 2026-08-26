import { useState } from 'react'
import { Box, IconButton, useTheme, Drawer } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import LogoFullSvg from 'src/assets/images/svg/nftfi-logo-full.svg'
import LogoIconSvg from 'src/assets/images/svg/nftfi-logo.svg'
import MenuIconSvg from 'src/assets/images/svg/ic-menu-icon.svg'
import { NavContent } from 'src/components/Navigation/NavContent'
import {
  navAnimationDuration,
  navWidth,
} from 'src/components/Navigation/config'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { WalletWidget } from 'src/components/Wallet/WalletWidget'

function LogoFull({ width }: { width?: number }) {
  return <LogoFullSvg width={width || 40} />
}

function LogoIcon({ width }: { width?: number }) {
  const theme = useTheme()
  return (
    <LogoIconSvg
      width={width || 40}
      height={width || 40}
      style={{ color: theme.palette.customPallette.nftfi.newLogoAccent }}
    />
  )
}

function MobileNavAndHeader() {
  const theme = useTheme()
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        open={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '280px',
            backgroundColor: theme.palette.customPallette.nftfi.pageBackground,
            borderRight: `1px dashed ${theme.palette.divider}`,
          },
        }}
      >
        <Box
          width='100%'
          height='100%'
          display='flex'
          flexDirection='column'
          bgcolor={theme.palette.customPallette.nftfi.pageBackground}
        >
          <Box display='flex' padding={2.8} justifyContent='end'>
            <LogoIconSvg
              style={{
                width: 34,
                height: 34,
                color: theme.palette.customPallette.nftfi.newLogoAccent,
              }}
            />
          </Box>
          <Box display='flex' justifyContent='center'>
            <WalletWidget />
          </Box>
          <NavContent />
        </Box>
      </Drawer>

      {/* Mobile Header Bar */}
      <Box
        display='flex'
        alignItems='center'
        width='100%'
        position='absolute'
        top={0}
        left={0}
        height={64}
        padding={2}
        zIndex={1100}
        sx={{
          backgroundColor: theme.palette.customPallette.nftfi.pageBackground,
        }}
      >
        <Box width='40px' display='flex' justifyContent='flex-start'>
          <IconButton onClick={() => setShowMobileDrawer(true)}>
            <MenuIconSvg />
          </IconButton>
        </Box>
        <Box
          flexGrow={1}
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <LogoFull width={100} />
        </Box>
        <Box width='40px' />
      </Box>
    </>
  )
}

function DesktopNav() {
  const theme = useTheme()
  const [navigationExpanded, setNavigationExpanded] = useLocalStorage(
    LocalStorageKeys.DashboardUserPreferences.NavigationExpanded
  )

  return (
    <>
      <Box
        sx={{
          width: navigationExpanded
            ? navWidth.expanded
            : navWidth.collapsed,
          height: '100%',
          transition: `width ${navAnimationDuration}s ease`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          margin: 0,
          borderRight: `1px dashed ${theme.palette.divider}`,
          overflow: 'hidden',
          backgroundColor: theme.palette.background.default,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            paddingTop: navigationExpanded
              ? 4
              : 4,
            paddingLeft: navigationExpanded
              ? 3
              : 0,
            paddingBottom: navigationExpanded
              ? 3
              : 2,
            display: 'flex',
            justifyContent: navigationExpanded
              ? 'flex-start'
              : 'center',
          }}
        >
          {navigationExpanded
            ? (
              <LogoFull width={92} />
            )
            : (
              <LogoIcon width={30} />
            )}
        </Box>
        <Box display='flex' justifyContent='center'>
          <WalletWidget minimise={!navigationExpanded} />
        </Box>
        <NavContent />
      </Box>

      {/* Toggle button for navigation */}
      <Box
        sx={{
          position: 'absolute',
          left: navigationExpanded
            ? navWidth.expanded
            : navWidth.collapsed,
          top: '35px',
          zIndex: 1000,
          transform: 'translateX(-50%)',
          transition: `left ${navAnimationDuration}s ease`,
        }}
      >
        <IconButton
          onClick={() => setNavigationExpanded(!navigationExpanded)}
          sx={{
            backgroundColor: theme.palette.customPallette.nftfi.pageBackground,
            border: `1px solid ${theme.palette.divider}`,
            width: '18px',
            height: '18px',
            padding: '1px',
            '&:hover': {
              background: theme.palette.customPallette.nftfi.rowDivider,
            },
          }}
          size='small'
        >
          <Iconify
            icon={
              navigationExpanded
                ? 'ph:caret-left-bold'
                : 'ph:caret-right-bold'
            }
          />
        </IconButton>
      </Box>
    </>
  )
}

export function DashboardNav() {
  const { isMobileView, isLaptopOrDesktopView } = useBreakpoints()

  return (
    <>
      {isMobileView && <MobileNavAndHeader />}
      {isLaptopOrDesktopView && <DesktopNav />}
    </>
  )
}
