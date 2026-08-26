import { alpha, Theme } from '@mui/material/styles'
import { ButtonProps, buttonClasses } from '@mui/material/Button'

// ----------------------------------------------------------------------

const COLORS = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
] as const

// NEW VARIANT
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true
    link: true
  }
}

// ----------------------------------------------------------------------

export function button(theme: Theme) {
  const lightMode = theme.palette.mode === 'light'

  const rootStyles = (ownerState: ButtonProps) => {
    const inheritColor = ownerState.color === 'inherit'

    const containedVariant = ownerState.variant === 'contained'

    const outlinedVariant = ownerState.variant === 'outlined'

    const textVariant = ownerState.variant === 'text'

    const softVariant = ownerState.variant === 'soft'

    const linkVariant = ownerState.variant === 'link'

    const smallSize = ownerState.size === 'small'

    const mediumSize = ownerState.size === 'medium'

    const largeSize = ownerState.size === 'large'

    const defaultStyle = {
      ...(inheritColor && {
        // CONTAINED
        ...(containedVariant && {
          color: lightMode
            ? theme.palette.common.white
            : theme.palette.grey[800],
          backgroundColor: lightMode
            ? theme.palette.grey[800]
            : theme.palette.common.white,
          '&:hover': {
            backgroundColor: lightMode
              ? theme.palette.grey[700]
              : theme.palette.grey[400],
          },
          '&:active': {
            backgroundColor: lightMode
              ? theme.palette.grey[900]
              : theme.palette.grey[300],
          },
        }),
        // OUTLINED
        ...(outlinedVariant && {
          borderColor: theme.palette.grey[500],
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '&:active': {
            backgroundColor: theme.palette.action.selected,
            borderColor: alpha(theme.palette.grey[500], 0.48),
          },
        }),
        // TEXT
        ...(textVariant && {
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '&:active': {
            backgroundColor: theme.palette.action.selected,
          },
        }),
        // SOFT
        ...(softVariant && {
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          '&:hover': {
            backgroundColor: alpha(theme.palette.grey[500], 0.24),
          },
          '&:active': {
            backgroundColor: alpha(theme.palette.grey[500], 0.32),
          },
        }),
        // LINK
        ...(linkVariant && {
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.grey[50],
          },
          '&:active': {
            backgroundColor: theme.palette.primary.dark,
            color: theme.palette.grey[50],
          },
        }),
      }),
      ...(outlinedVariant && {
        '&:hover': {
          borderColor: 'currentColor',
          boxShadow: '0 0 0 0.5px currentColor',
        },
      }),
    }

    const colorStyle = COLORS.map(color => ({
      ...(ownerState.color === color && {
        // CONTAINED
        ...(containedVariant && {
          '&:hover': {
            boxShadow: theme.customShadows[color],
          },
          '&:active': {
            boxShadow: theme.customShadows[color],
          },
        }),
        // SOFT
        ...(softVariant && {
          color: theme.palette[color][lightMode
            ? 'dark'
            : 'light'],
          backgroundColor: alpha(theme.palette[color].main, 0.16),
          '&:hover': {
            backgroundColor: alpha(theme.palette[color].main, 0.32),
          },
          '&:active': {
            backgroundColor: alpha(theme.palette[color].main, 0.4),
          },
        }),
      }),
    }))

    const primaryContainedStyle = {
      ...(ownerState.color === 'primary'
        && ownerState.variant === 'contained' && {
        backgroundColor: lightMode
          ? theme.palette.primary.light
          : theme.palette.primary.main,
        color: theme.palette.common.white,
        padding: '0 24px', // Example custom padding
        borderRadius: 8, // Example custom border radius
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
        '&:active': {
          backgroundColor:
              theme.palette.primary.darker || theme.palette.primary.dark,
        },
        // '&:disabled': {
        //   backgroundColor: lightMode
        //     ? theme.palette.primary.lighter
        //     : theme.palette.primary.light,
        //   color: theme.palette.action.disabled,
        // },
      }),
    }

    const disabledState = {
      [`&.${buttonClasses.disabled}`]: {
        // SOFT
        ...(softVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
      },
    }

    const size = {
      ...(smallSize && {
        height: 30,
        fontSize: 13,
        paddingLeft: 8,
        paddingRight: 8,
        ...(textVariant && {
          paddingLeft: 4,
          paddingRight: 4,
        }),
      }),
      ...(mediumSize && {
        height: 36,
        minHeight: 36,
        paddingLeft: 12,
        paddingRight: 12,
        ...(textVariant && {
          paddingLeft: 8,
          paddingRight: 8,
        }),
      }),
      ...(largeSize && {
        height: 48,
        fontSize: 15,
        paddingLeft: 16,
        paddingRight: 16,
        ...(textVariant && {
          paddingLeft: 10,
          paddingRight: 10,
        }),
      }),
    }

    return [
      defaultStyle,
      ...colorStyle,
      primaryContainedStyle,
      disabledState,
      size,
    ]
  }

  return {
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: ButtonProps }) =>
          rootStyles(ownerState),
      },
    },
  }
}
