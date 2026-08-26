import { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function card(theme: Theme) {
  const lightMode = theme.palette.mode === 'light'

  return {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: lightMode
            ? theme.palette.grey[100]
            : theme.palette.customPallette.nftfi.paper,
          position: 'relative',
          boxShadow: theme.customShadows.card,
          borderRadius: theme.shape.borderRadius * 2,
          zIndex: 0, // Fix Safari overflow: hidden with border radius
          // display: 'flex',
          padding: theme.spacing(3),
          overflow: 'visible',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3, 3, 0),
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(3),
        },
      },
    },
  }
}
