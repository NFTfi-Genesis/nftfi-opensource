/*
  Use this hook for more advanced control, e.g. conditionally rendering components based on screen size, and other cases where MUI's responsive props, e.g.: direction: {{ xs: 'column', md: 'row' }} won't suffice.
*/

import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

export function useBreakpoints() {
  const theme = useTheme()

  const isMobileView = useMediaQuery(theme.breakpoints.down('sm'))
  const isLaptopView = useMediaQuery(theme.breakpoints.between('sm', 'xl'))
  const isDesktopView = useMediaQuery(theme.breakpoints.up('xl'))
  const isMobileOrLaptopView = useMediaQuery(theme.breakpoints.down('xl'))
  const isLaptopOrDesktopView = useMediaQuery(theme.breakpoints.up('sm'))

  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))

  return { mdUp, mdDown, isMobileView, isLaptopView, isDesktopView, isMobileOrLaptopView, isLaptopOrDesktopView }
}
