import { Box, List } from '@mui/material'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Scrollbar } from 'src/components/Scrollbar/Scrollbar'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { NavItem } from './NavItem'
import { getNavSections } from './config'

export function NavContent() {
  const { t } = useTranslation()
  const location = useLocation()
  const { isMobileView } = useBreakpoints()
  const [navigationExpanded] = useLocalStorage(
    LocalStorageKeys.DashboardUserPreferences.NavigationExpanded
  )

  const navSections = getNavSections(t)
  const activeItem = location.pathname
  const collapsed = !navigationExpanded && !isMobileView

  const [openState, setOpenState] = useState<Record<string, boolean>>({
    '/borrow': true,
    '/lend': true,
    '/market': true,
  })

  const setOpenSection = (path: string, isOpen: boolean) => {
    setOpenState(prev => ({
      ...prev,
      [path]: isOpen,
    }))
  }

  useEffect(() => {
    if (activeItem.startsWith('/dashboard')) {
      setOpenState(prev => ({
        ...prev,
        '/dashboard': true,
      }))
    } else if (activeItem.startsWith('/user')) {
      setOpenState(prev => ({
        ...prev,
        '/user': true,
      }))
    }
  }, [activeItem])

  return (
    <Scrollbar>
      <List disablePadding sx={{ px: collapsed
        ? 0
        : 2, py: 1 }}>
        {navSections.map(section => (
          <Box key={section.subheader || 'main-nav'} sx={{ mb: 1 }}>
            {section.items.map(item => {
              return (
                <NavItem
                  key={item.title}
                  item={item}
                  open={item.path
                    ? openState[item.path] || false
                    : false}
                  onOpen={value =>
                    item.path && setOpenSection(item.path, value)
                  }
                  collapsed={collapsed}
                />
              )
            })}
          </Box>
        ))}
      </List>
    </Scrollbar>
  )
}
