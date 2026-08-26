import { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function iconButton(theme: Theme) {
  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            color: theme.palette.text.primary,
            opacity: 0.8,
          },
          '&:active': {
            opacity: 0.6,
          },
        },
      },
    },
  }
}
