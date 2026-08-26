import { Theme } from '@mui/material/styles'
import { pxToRem } from 'src/modules/theme/typography'

// ----------------------------------------------------------------------

export function typography(theme: Theme) {
  return {
    MuiTypography: {
      styleOverrides: {
        paragraph: {
          marginBottom: theme.spacing(2),
        },
        gutterBottom: {
          marginBottom: theme.spacing(1),
        },
        caption: {
          lineHeight: pxToRem(18),
          fontSize: pxToRem(12),
          color: theme.palette.text.secondary,
        },
        overline: {
          lineHeight: '18px',
          textTransform: 'none',
        },
      },
    },
  }
}
