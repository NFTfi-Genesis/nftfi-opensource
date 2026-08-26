import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Box,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  alpha,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Link, useLocation } from 'react-router-dom'
import { camelCase } from 'lodash'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { getTestId } from 'src/utils/testing'
import { NavComponentProps } from './types'
import { navCollapsedPopoverDelayMs } from './config'
import { NavIcon } from './NavIcon'

export function CollapsedMenuItem({
  item,
  open,
  onOpen,
  collapsed,
}: Omit<NavComponentProps, 'active'>) {
  const theme = useTheme()
  const location = useLocation()
  const { t } = useTranslation()
  const { setDrawerOpen } = useDrawers()
  const active = location.pathname
  const anchorRef = useRef<HTMLLIElement>(null)
  const [openPopover, setOpenPopover] = useState(false)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showPopover = Boolean(
    collapsed && item.children && item.children.length > 0
  )

  const isActiveRoot
    = active === item.path
    || (item.children && item.children.some(child => active === child.path))

  const isContactsItem = item.title === t('dashboard.contacts')

  const handleOpenMenu = useCallback(() => {
    // Clear any pending close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (showPopover) {
      setOpenPopover(true)
    } else {
      onOpen(!open)
    }
  }, [showPopover, open, onOpen])

  const handleContactsClick = useCallback(() => {
    if (isContactsItem) {
      setDrawerOpen(DrawerType.Contacts, true)
    }
  }, [isContactsItem, setDrawerOpen])

  // Add a delay to close the popover, to give time to move to the cursor to the popover
  const handleCloseMenu = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setOpenPopover(false)
    }, navCollapsedPopoverDelayMs)
  }, [])

  // Close popover when active item changes
  useEffect(() => {
    if (openPopover) {
      handleCloseMenu()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const linkProps = useMemo(() => {
    if (item.children || !item.path) {
      return {}
    }
    if (item.external) {
      return {
        href: item.path,
        rel: 'noopener noreferrer',
      }
    }
    return {
      to: `${item.path}${location.search}`,
    }
  }, [item, location.search])

  return (
    <Box paddingX={0.8} paddingY={0.5}>
      <ListItemButton
        component={
          !item.path
            ? 'div'
            : item.children
              ? 'li'
              : item.external
                ? 'a'
                : Link
        }
        {...linkProps}
        ref={anchorRef}
        onClick={
          isContactsItem
            ? handleContactsClick
            : item.children
              ? handleOpenMenu
              : undefined
        }
        onMouseEnter={item.children
          ? handleOpenMenu
          : undefined}
        onMouseLeave={item.children
          ? handleCloseMenu
          : undefined}
        {...getTestId(`nav.${camelCase(item.title)}`)}
        sx={{
          padding: 0.7,
          borderRadius: 1,
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          textAlign: 'center',
          color: isActiveRoot
            ? theme.palette.primary.light
            : theme.palette.text.secondary,
          bgcolor: isActiveRoot
            ? alpha(theme.palette.primary.light, 0.1)
            : 'transparent',
          transition: theme.transitions.create(['all'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': {
            opacity: isActiveRoot
              ? 1
              : 0.8,
            bgcolor: isActiveRoot
              ? alpha(theme.palette.primary.light, 0.1)
              : 'transparent',
          },
        }}
      >
        <Stack alignItems='center' spacing={0.2}>
          <ListItemIcon
            sx={{
              width: 24,
              height: 24,
              color: 'inherit',
              minWidth: 'auto',
              mr: 0,
              mb: 0,
              justifyContent: 'center',
            }}
          >
            {NavIcon(item, isActiveRoot
              ? theme.palette.text.primary
              : 'inherit')}
          </ListItemIcon>

          <Typography
            variant='caption'
            sx={{
              whiteSpace: 'nowrap',
              fontWeight: isActiveRoot
                ? 600
                : 500,
              fontSize: '10px',
              maxWidth: '100%',
              display: 'block',
              textAlign: 'center',
              color: isActiveRoot
                ? theme.palette.primary.light
                : theme.palette.text.secondary,
            }}
          >
            {item.title}
          </Typography>
        </Stack>
        {showPopover && (
          <Iconify
            icon='eva:arrow-ios-forward-fill'
            width={16}
            height={16}
            sx={{
              position: 'absolute',
              top: 11,
              right: 6,
              flexShrink: 0,
              color: 'inherit',
            }}
          />
        )}
      </ListItemButton>

      {/* Popover menu for collapsed mode */}
      {showPopover && (
        <Popover
          disableScrollLock
          open={openPopover}
          anchorEl={anchorRef.current}
          anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
          transformOrigin={{ vertical: 'center', horizontal: 'left' }}
          slotProps={{
            paper: {
              onMouseEnter: handleOpenMenu,
              onMouseLeave: handleCloseMenu,
              sx: {
                padding: 0,
                minWidth: 160,
                borderRadius: 1,
                ...(openPopover && {
                  pointerEvents: 'auto',
                }),
              },
            },
          }}
          sx={{
            pointerEvents: 'none',
          }}
        >
          <Stack
            spacing={0.5}
            sx={{ p: 1 }}
            bgcolor={theme.palette.customPallette.nftfi.pageBackground}
          >
            {/* Popover items - direct children without category header */}
            {item.children?.map(child => {
              const isActive = active === child.path

              return (
                <ListItemButton
                  key={child.title}
                  component={Link}
                  to={`${child.path}${location.search}`}
                  sx={{
                    minHeight: 34,
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    position: 'relative',
                    color: isActive
                      ? theme.palette.common.white
                      : theme.palette.text.secondary,
                    fontWeight: isActive
                      ? 600
                      : 500,
                    bgcolor: 'transparent',
                    transition: theme.transitions.create(['all'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: isActive
                        ? theme.palette.common.white
                        : theme.palette.text.primary,
                    },
                  }}
                >
                  <ListItemText
                    primary={child.title}
                    primaryTypographyProps={{
                      noWrap: true,
                      variant: 'body2',
                      fontSize: 14,
                      fontWeight: 'inherit',
                    }}
                  />
                </ListItemButton>
              )
            })}
          </Stack>
        </Popover>
      )}
    </Box>
  )
}
