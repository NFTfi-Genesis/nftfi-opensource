import { useTheme } from '@mui/material/styles'
import { Box } from '@mui/material'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'

export function PageContainer({ children }: { children: React.ReactNode }) {
  const { isMobileView } = useBreakpoints()
  const theme = useTheme()

  return (
    <Box
      sx={{
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
        height: isMobileView
          ? 'calc(100vh - 64px - 18px)'
          : '100%',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        paddingY: isMobileView
          ? 0
          : 3,
        paddingRight: isMobileView
          ? 2
          : `24px`,
        paddingLeft: isMobileView
          ? 2
          : 3,
        margin: 0,
        backgroundColor: theme.palette.background.default,
        position: 'relative',
      }}
    >
      {children}
    </Box>
  )
}
