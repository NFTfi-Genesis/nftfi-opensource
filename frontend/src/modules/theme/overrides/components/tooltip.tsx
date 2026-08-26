import { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function tooltip(theme: Theme) {
  return {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: theme.palette.background?.paperOffset,
          padding: '16px',
          fontSize: '0.75rem',
          borderRadius: '16px',
          boxShadow: theme.shadows[3],
        },
        arrow: {
          color: theme.palette.grey[800],
          '&.MuiTooltip-arrow': {
            color:
              theme.palette.background?.paperOffset || theme.palette.grey[800],
          },
        },
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 0],
              },
            },
          ],
        },
      },
    },
  }
}
