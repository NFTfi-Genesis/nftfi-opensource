import { Theme, alpha } from '@mui/material/styles'

// ----------------------------------------------------------------------
// TODO: need to allow to choose whether selected item should have hover state or not
// This is useful to show to user if he can interact with selected item
export function menuItem(theme: Theme) {
  return {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          ...theme.typography.body2,
          padding: theme.spacing(0.75, 1),
          borderRadius: theme.shape.borderRadius * 0.75,
          '&:not(:last-of-type)': {
            marginBottom: 4,
          },
          '&:hover': {},
          '&.Mui-selected': {
            fontWeight: theme.typography.fontWeightSemiBold,
            backgroundColor: theme.palette.action.selected,
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[500], 0.23),
            },
          },
        },
      },
    },
  }
}
