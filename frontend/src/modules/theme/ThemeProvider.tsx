import { useMemo, useEffect, useState } from 'react'
import merge from 'lodash/merge'

import CssBaseline from '@mui/material/CssBaseline'
import {
  createTheme,
  ThemeOptions,
  ThemeProvider as MuiThemeProvider,
  alpha,
} from '@mui/material/styles'

import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { palette } from './palette'
import { shadows } from './shadows'
import { typography } from './typography'
import { customShadows } from './custom-shadows'
import { componentsOverrides } from './overrides/overrides'
import { createPresets } from './options/presets'
import { ThemeMode } from './types'
import { dynamicWalletThemeOverrides } from './css'

const presets = createPresets('default')
const buildTheme = (mode: Exclude<ThemeMode, ThemeMode.system>) => {
  const themeValue = {
    palette: {
      ...palette(mode),
      ...presets.palette,
    },
    customShadows: {
      ...customShadows(mode),
      ...presets.customShadows,
    },
    shadows: shadows(mode),
    shape: { borderRadius: 8 },
    typography,
    breakpoints: {
      values: {
        xs: 0,
        sm: 900,
        md: 1400,
        lg: 1400,
        xl: 1513,
      },
    },
  }

  const theme = createTheme(themeValue as ThemeOptions)
  theme.components = merge(componentsOverrides(theme), {
    MuiCssBaseline: {
      styleOverrides: {
        ...dynamicWalletThemeOverrides(theme),
        '*': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '12px',
            backgroundColor: 'transparent',
            borderRadius: '12px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.grey[600], 0.48),
            borderRadius: '12px',
          },
        },
        // Very straightforward way to fix the table header having small rectangle of different color.
        '.MuiDataGrid-scrollbarFiller.MuiDataGrid-scrollbarFiller--header': {
          backgroundColor: theme.palette.background.header,
        },
      },
    },
  })

  return theme
}

const Themes = {
  [ThemeMode.dark]: buildTheme(ThemeMode.dark),
  [ThemeMode.light]: buildTheme(ThemeMode.light),
}

function getSystemThemeMode(): Exclude<ThemeMode, ThemeMode.system> {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? ThemeMode.dark
    : ThemeMode.light
}

const getTheme = (mode: ThemeMode) => {
  if (mode === ThemeMode.dark) {
    return Themes[ThemeMode.dark]
  }
  if (mode === ThemeMode.light) {
    return Themes[ThemeMode.light]
  }
  if (mode === ThemeMode.system) {
    return Themes[getSystemThemeMode()]
  }
}

type ThemeProviderProps = {
  children: React.ReactNode
  initialThemeMode?: ThemeMode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode] = useLocalStorage(LocalStorageKeys.ThemeMode)
  const [refreshTriggered, triggerRefresh] = useState(Date.now())

  // Listen for changes in system theme.
  // Trigger theme recalculation when system theme changes.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      triggerRefresh(Date.now())
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () =>
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const theme = useMemo(
    () => getTheme(themeMode ?? ThemeMode.system),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeMode, refreshTriggered]
  )

  return (
    <MuiThemeProvider theme={theme!}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
