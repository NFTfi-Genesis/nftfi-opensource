import { alpha, Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function dialog(theme: Theme) {
  return {
    MuiDialog: {
      styleOverrides: {
        paper: {
          backdropFilter: 'blur(4.5px)',
          WebkitBackdropFilter: 'blur(4.5px)',
          backgroundColor: alpha(theme.palette.customPallette.nftfi.paperRecess, 0.5),
          padding: theme.spacing(2),
          borderRadius: '34px',
          gap: theme.spacing(1.5),
          boxShadow: 'none',
          [theme.breakpoints.up('sm')]: {
            minWidth: '632px',
            maxWidth: '632px',
          },
          margin: 0,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
  }
}
