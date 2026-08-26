import { ReactNode, useMemo, useCallback, useEffect } from 'react'
import { Drawer, Stack, Typography, IconButton } from '@mui/material'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { getTestId } from 'src/utils/testing'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { Iconify } from './Iconify'

export type ActionsDrawerProps = {
  title: string
  children: ReactNode
  drawerType: DrawerType
  pinnable?: boolean
  width?: string
}

export function ActionsDrawer({
  title,
  drawerType,
  children,
  pinnable = true,
  width = '370px',
}: ActionsDrawerProps) {
  const {
    pinnedDrawer,
    pinDrawer,
    unpinDrawer,
    isDrawerOpen,
    setDrawerOpen,
    setDrawerWidth,
  } = useDrawers()
  const { isDesktopView, isMobileView } = useBreakpoints()

  const open = useMemo(
    () => isDrawerOpen(drawerType),
    [isDrawerOpen, drawerType]
  )

  const isPinned = useMemo(
    () => pinnedDrawer === drawerType,
    [pinnedDrawer, drawerType]
  )

  const setOpen = useCallback(
    (open: boolean) => {
      if (!open && isPinned) {
        return
      }
      setDrawerOpen(drawerType, open)
    },
    [setDrawerOpen, drawerType, isPinned]
  )

  const handleIsPinnedChange = useCallback(() => {
    if (pinnedDrawer === drawerType) {
      unpinDrawer()
    } else {
      pinDrawer(drawerType)
      setDrawerWidth(width)
    }
  }, [pinnedDrawer, drawerType, pinDrawer, unpinDrawer, setDrawerWidth, width])

  const handleClose = useCallback(() => {
    if (isPinned) {
      unpinDrawer()
    }
    setDrawerOpen(drawerType, false)
  }, [isPinned, unpinDrawer, setDrawerOpen, drawerType])

  useEffect(() => {
    if (isPinned) {
      setDrawerWidth(width)
    }
  }, [isPinned, setDrawerWidth, width])

  return (
    <Drawer
      anchor={'right'}
      open={open}
      onClose={() => setOpen(false)}
      hideBackdrop={isPinned}
      sx={{
        ...(width
          ? {
            '& .MuiDrawer-paper': {
              width: width
                ? width
                : isMobileView
                  ? '80%'
                  : '380px',
            },
          }
          : {}),
      }}
    >
      <Stack gap={1.5} p={2.5}>
        <Stack direction='row' alignItems='center' justifyContent='flex-end'>
          <Typography flexGrow={1} variant='h6'>
            {title}
          </Typography>
          {isDesktopView && pinnable && (
            <IconButton onClick={handleIsPinnedChange}>
              <Iconify icon={isPinned
                ? 'ph:push-pin-fill'
                : 'ph:push-pin'} />
            </IconButton>
          )}
          <IconButton
            onClick={handleClose}
            {...getTestId('drawer.close')}
          >
            <Iconify icon='ph:x' />
          </IconButton>
        </Stack>
        {children}
      </Stack>
    </Drawer>
  )
}
