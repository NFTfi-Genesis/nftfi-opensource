import { MaterialDesignContent } from 'notistack'

import { alpha, styled } from '@mui/material/styles'

// ----------------------------------------------------------------------

export const StyledNotistack = styled(MaterialDesignContent)(({ theme }) => {
  const lightMode = theme.palette.mode === 'light'

  return {
    '& #notistack-snackbar': {
      ...theme.typography.subtitle2,
      padding: 0,
      flexGrow: 1,
      flexShrink: 1,
      flexWrap: 'nowrap',
      display: 'flex',
    },
    '&.notistack-MuiContent': {
      display: 'flex',
      flexWrap: 'nowrap',
      color: theme.palette.text.primary,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1, 2, 1, 1),
      backgroundColor: theme.palette.customPallette.nftfi.paper,
      gap: theme.spacing(2),
    },
    '&.notistack-MuiContent-default': {
      padding: theme.spacing(1, 2, 1, 1),
      color: lightMode
        ? theme.palette.common.white
        : theme.palette.grey[800],
      backgroundColor: lightMode
        ? theme.palette.grey[800]
        : theme.palette.common.white,
    },
  }
})

// ----------------------------------------------------------------------

type StyledIconProps = {
  color: 'info' | 'success' | 'warning' | 'error'
}

export const StyledIcon = styled('span')<StyledIconProps>(
  ({ color, theme }) => ({
    width: 44,
    minWidth: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(1.5),
    color: theme.palette[color].main,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette[color].main, 0.16),
  })
)
