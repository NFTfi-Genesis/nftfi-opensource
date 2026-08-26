import { Box, Stack } from '@mui/material'
import { useMemo } from 'react'
import { config } from 'src/config/config'
import { DashboardNav } from 'src/components/Navigation/DashboardNav'
import { AlertComponent } from 'src/components/Alert/Alert'
import { AnnouncementBanner } from 'src/components/Alert/AnnouncementBanner'
import { AlertSeverity } from 'src/components/Alert/types'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { ContactsDrawer } from 'src/features/contacts/ContactsDrawer'
import { PageContainer } from 'src/components/Layouts/PageContainer'

interface LayoutProps {
  children: React.ReactNode
}

const DRAWER_ANIMATION_DURATION = 0.3

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { isMobileView } = useBreakpoints()
  const { isDesktopView } = useBreakpoints()
  const { isDrawerPinned, drawerWidth } = useDrawers()
  const drawerIsPinned = useMemo(() => isDrawerPinned(), [isDrawerPinned])

  return (
    <Box
      display='flex'
      width='100vw'
      height='100vh'
      flexDirection='row'
      overflow='hidden'
      margin={0}
      padding={0}
      paddingTop={isMobileView
        ? config.showStaleDashboardDataAlert
          ? '8px'
          : '64px'
        : 0}
      boxSizing='border-box'
      position='relative'
    >
      <DashboardNav />
      <Stack
        display='flex'
        flexDirection='column'
        flex={1}
        minWidth={0}
        height='100%'
      >
        <AnnouncementBanner />
        {config.showStaleDashboardDataAlert && (
          <AlertComponent
            isActive={true}
            message={t('warning-messages.stale-dashboard-data')}
            severity={AlertSeverity.Warning}
          />
        )}
        <PageContainer>
          {children}
        </PageContainer>
      </Stack>
      {isDesktopView && (
        <Box
          sx={{
            width: drawerIsPinned && drawerWidth
              ? drawerWidth
              : 0,
            height: '100%',
            flexShrink: 0,
            transition: `width ${DRAWER_ANIMATION_DURATION}s ease`,
            overflow: 'hidden',
          }}
        />
      )}
      <ContactsDrawer />
    </Box>
  )
}
