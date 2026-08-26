import { alpha, Theme } from '@mui/material/styles'
import { drawerClasses, DrawerProps } from '@mui/material/Drawer'

import { paper } from '../../css'

// ----------------------------------------------------------------------

export function drawer(theme: Theme) {
  const lightMode = theme.palette.mode === 'light'

  return {
    MuiDrawer: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: DrawerProps }) => ({
          ...(ownerState.variant === 'temporary' && {
            [`& .${drawerClasses.paper}`]: {
              ...paper({ theme }),
              ...(ownerState.anchor === 'left' && {
                boxShadow: `40px 40px 80px -8px ${alpha(lightMode
                  ? theme.palette.grey[500]
                  : theme.palette.common.black, 0.24)}`,
              }),
              ...(ownerState.anchor === 'right'
                && !ownerState.hideBackdrop && {
                boxShadow: `-40px 40px 80px -8px ${alpha(lightMode
                  ? theme.palette.grey[500]
                  : theme.palette.common.black, 0.64)}`,
              }),
              pointerEvents: 'auto',
            },
            '& .MuiBackdrop-root': {
              backgroundColor: 'transparent',
            },
          }),
          pointerEvents: ownerState.hideBackdrop
            ? 'none'
            : 'auto',
        }),
      },
    },
  }
}
