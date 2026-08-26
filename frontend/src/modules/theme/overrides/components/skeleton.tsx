import { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function skeleton(theme: Theme) {
  return {
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.background.neutral,
          minHeight: '18px',
          width: '100%',
          height: 'auto',
        },
        // rounded: {
        //   borderRadius: theme.shape.borderRadius * 2,
        // },
      },
      defaultProps: {
        animation: 'false',
      },
    },
  }
}
