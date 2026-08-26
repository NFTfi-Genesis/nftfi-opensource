import React, { useCallback } from 'react'
import { useTheme } from '@mui/material/styles'
import {
  ListItemButton,
  ListItemText,
  Collapse,
  List,
  ListItemIcon,
  alpha,
} from '@mui/material'
import { Link, useLocation } from 'react-router-dom'
import { camelCase } from 'lodash'
import { Iconify } from 'src/components/Iconify'

import { useTranslation } from 'src/modules/translation/useTranslation'
import { useDrawers } from 'src/modules/drawers/DrawersProvider'
import { DrawerType } from 'src/modules/drawers/DrawerType'
import { getTestId } from 'src/utils/testing'
import { NavComponentProps } from './types'
import { CollapsedMenuItem } from './CollapsedMenuItem'
import { navItemsPaddingLeft } from './config'
import { NavIcon } from './NavIcon'

// We're keeping item, open and onOpen props since they're specific to each item
// But we can get active path from useLocation
export function NavItem({
  item,
  open,
  onOpen,
  collapsed,
}: Omit<NavComponentProps, 'active'>) {
  const theme = useTheme()
  const { t } = useTranslation()
  const { setDrawerOpen } = useDrawers()

  if (collapsed) {
    return (
      <CollapsedMenuItem
        item={item}
        open={open}
        onOpen={onOpen}
        collapsed={collapsed}
      />
    )
  }

  const childDot: React.CSSProperties = {
    width: 8,
    height: 8,
    left: 20,
    opacity: 0.8,
    content: '""',
    borderRadius: '50%',
    position: 'absolute',
    backgroundColor: 'currentColor',
    color: theme.palette.primary.light,
  }

  if (item.children) {
    return (
      <NavItemWithChildren
        item={item}
        open={open}
        onOpen={onOpen}
        collapsed={collapsed}
        childDot={childDot}
      />
    )
  } else {
    const isContactsItem = item.title === t('dashboard.contacts')
    const handleOpenContactsDrawer = () => setDrawerOpen(DrawerType.Contacts, true)
    return (
      <NavItemSimple
        item={item}
        collapsed={collapsed}
        childDot={childDot}
        isContactsItem={isContactsItem}
        openDrawer={handleOpenContactsDrawer}
      />
    )
  }
}

function NavItemSimple({
  item,
  collapsed,
  childDot,
  isContactsItem = false,
  openDrawer,
}: Omit<NavComponentProps, 'open' | 'onOpen' | 'active'> & {
  childDot: React.CSSProperties
  isContactsItem?: boolean
  openDrawer?: () => void
}) {
  const theme = useTheme()
  const { pathname, search } = useLocation()
  const active = pathname

  const handleClick = () => {
    if (isContactsItem && openDrawer) {
      openDrawer()
    }
  }

  return (
    <ListItemButton
      component={!item.path
        ? 'div'
        : item.external
          ? 'a'
          : Link}
      {...(!item.path
        ? {}
        : item.external
          ? { href: item.path }
          : { to: `${item.path}${search}` })}
      {...(item.external && { rel: 'noopener noreferrer' })}
      onClick={isContactsItem
        ? handleClick
        : undefined}
      {...getTestId(`nav.${camelCase(item.title)}`)}
      sx={{
        paddingLeft: collapsed
          ? 0
          : navItemsPaddingLeft.expanded,
        height: 44,
        borderRadius: 1,
        mb: 0.5,
        position: 'relative',
        justifyContent: collapsed
          ? 'center'
          : 'flex-start',
        color:
          active === item.path
            ? theme.palette.primary.light
            : theme.palette.text.secondary,
        fontWeight:
          active === item.path
            ? theme.typography.fontWeightSemiBold
            : theme.typography.fontWeightMedium,
        bgcolor:
          active === item.path
            ? alpha(theme.palette.primary.light, 0.1)
            : 'transparent',
        transition: theme.transitions.create(['all'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          opacity: 0.6,
          bgcolor:
            active === item.path
              ? alpha(theme.palette.primary.light, 0.1)
              : 'transparent',
        },
        ...(active === item.path && {
          '&:before': childDot,
        }),
      }}
    >
      <ListItemIcon
        sx={{
          width: 24,
          height: 24,
          color: 'inherit',
          minWidth: collapsed
            ? 36
            : 'auto',
          mr: collapsed
            ? 0
            : 2,
          justifyContent: 'center',
        }}
      >
        {NavIcon(item)}
      </ListItemIcon>

      {!collapsed && (
        <>
          <ListItemText
            primary={item.title}
            primaryTypographyProps={{
              noWrap: true,
              fontWeight: 'inherit',
              variant: 'body2',
            }}
          />

          {item.info && item.info}
        </>
      )}
    </ListItemButton>
  )
}

function NavItemWithChildren({
  item,
  open,
  onOpen,
  collapsed,
  childDot,
}: Omit<NavComponentProps, 'active'> & { childDot: React.CSSProperties }) {
  const theme = useTheme()
  const { pathname, search } = useLocation()
  const active = pathname

  const handleToggle = useCallback(() => {
    onOpen(!open)
  }, [open, onOpen])

  const isActiveRoot
    = active === item.path
    || (item.children && item.children.some(child => active === child.path))

  return (
    <>
      <ListItemButton
        onClick={handleToggle}
        sx={{
          paddingLeft: collapsed
            ? 0
            : navItemsPaddingLeft.expanded,
          paddingRight: collapsed
            ? 0
            : 1,
          height: 44,
          position: 'relative',
          borderRadius: 1,
          mb: 0.5,
          justifyContent: collapsed
            ? 'center'
            : 'flex-start',
          color: isActiveRoot
            ? theme.palette.primary.light
            : theme.palette.text.secondary,
          fontWeight: isActiveRoot
            ? theme.typography.fontWeightSemiBold
            : theme.typography.fontWeightMedium,
          bgcolor: isActiveRoot
            ? alpha(theme.palette.primary.light, 0.1)
            : 'transparent',
          transition: theme.transitions.create(['all'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': {
            opacity: 0.8,
            bgcolor: isActiveRoot
              ? alpha(theme.palette.primary.light, 0.1)
              : 'transparent',
          },
        }}
      >
        <ListItemIcon
          sx={{
            width: 24,
            height: 24,
            color: 'inherit',
            minWidth: collapsed
              ? 36
              : 'auto',
            mr: collapsed
              ? 0
              : 2,
            justifyContent: 'center',
          }}
        >
          {NavIcon(item, isActiveRoot
            ? theme.palette.text.primary
            : 'inherit')}
        </ListItemIcon>

        {!collapsed && (
          <>
            <ListItemText
              primary={item.title}
              primaryTypographyProps={{
                noWrap: true,
                variant: 'body2',
                fontSize: 14,
                fontWeight: 'inherit',
              }}
            />

            <Iconify
              width={16}
              icon={
                open
                  ? 'eva:arrow-ios-downward-fill'
                  : 'eva:arrow-ios-forward-fill'
              }
              sx={{ ml: 1, flexShrink: 0 }}
            />
          </>
        )}
      </ListItemButton>

      {!collapsed && (
        <Collapse in={open} unmountOnExit>
          <List disablePadding>
            {item.children?.map(child => {
              const isActive = active === child.path

              return (
                <ListItemButton
                  key={child.title}
                  component={Link}
                  to={`${child.path}${search}`}
                  sx={{
                    paddingLeft: 6.5,
                    paddingY: 1,
                    borderRadius: 1,
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
                    ...(isActive && {
                      '&:before': childDot,
                    }),
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
          </List>
        </Collapse>
      )}
    </>
  )
}
