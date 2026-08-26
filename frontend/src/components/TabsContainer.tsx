import React, { useEffect } from 'react'
import { Tabs, Tab, Box, alpha } from '@mui/material'
import { useLocation, useNavigate, matchPath } from 'react-router-dom'
import { Scrollbar } from 'src/components/Scrollbar/Scrollbar'
import { parseUrl, mergeQS } from 'src/utils/urls'

export type Tab = {
  label: string
  url: string
  content?: React.ReactNode
  disabled?: boolean
}

export type TabsContainerProps = {
  tabs: Tab[]
  defaultTab?: number
  onChange?: (index: number) => void
  headerAdditionalContent?: React.ReactNode
  showBorderLine?: boolean
}

export function TabsContainer({
  tabs,
  defaultTab = 0,
  onChange,
  headerAdditionalContent,
  showBorderLine = true,
}: TabsContainerProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTabIndex = tabs.findIndex(tab => {
    const { pathname: tabPathname } = parseUrl(tab.url)
    return matchPath({ path: tabPathname, end: true }, location.pathname)
  })

  useEffect(() => {
    if (activeTabIndex === -1 && tabs.length > 0) {
      const { pathname, search: tabSearch } = parseUrl(tabs[defaultTab].url)
      navigate(
        {
          pathname,
          search: mergeQS(location.search, tabSearch),
        },
        { replace: true },
      )
    }
  }, [activeTabIndex, defaultTab, navigate, tabs, location.search])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (tabs[newValue].disabled) {
      return
    }

    const { pathname, search: tabSearch } = parseUrl(tabs[newValue].url)
    navigate({
      pathname,
      search: mergeQS(location.search, tabSearch),
    })
    onChange?.(newValue)
  }

  if (!tabs.length) {
    return null
  }

  const hasAnyContent = tabs.some(tab => tab.content !== undefined)

  return (
    <Box width='100%' height='74px' display='flex' flexDirection='column'>
      <Box
        paddingX={2.5}
        borderBottom={showBorderLine
          ? 1
          : 0}
        borderColor={theme => alpha(theme.palette.grey[500], 0.08)}
        height={70}
        display='flex'
        justifyContent='space-between'
      >
        <Tabs
          value={activeTabIndex !== -1
            ? activeTabIndex
            : defaultTab}
          onChange={handleTabChange}
          aria-label='navigation tabs'
          variant='scrollable'
          scrollButtons='auto'
          slotProps={{
            list: { style: { height: '100%' } },
            scroller: { style: { height: '100%' } },
          }}
          sx={{
            height: '100%',
            alignItems: 'center',
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.url}
              label={tab.label}
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
              disabled={tab.disabled}
            />
          ))}
        </Tabs>
        {headerAdditionalContent}
      </Box>
      {hasAnyContent && (
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {tabs.map((tab, index) => {
            const isActive
              = activeTabIndex !== -1
                ? activeTabIndex === index
                : defaultTab === index

            return (
              <Box
                key={tab.url}
                role='tabpanel'
                hidden={!isActive}
                id={`tabpanel-${index}`}
                aria-labelledby={`tab-${index}`}
                sx={{
                  height: '100%',
                  width: '100%',
                  overflow: 'hidden',
                  display: isActive
                    ? 'block'
                    : 'none',
                }}
              >
                {isActive && tab.content && <Scrollbar>{tab.content}</Scrollbar>}
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
