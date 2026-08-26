import { alpha } from '@mui/material/styles'

export type ColorSchema = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'

declare module '@mui/material/styles/createPalette' {
  interface TypeBackground {
    header: string
    neutral: string
    paperOffset: string
    tooltip: string
  }

  interface SimplePaletteColorOptions {
    lighter: string
    darker: string
  }

  interface PaletteColor {
    lighter: string
    darker: string
  }

  interface Palette {
    toggle: {
      foreground: string
      background: string
      border: string
    }
  }

  interface PaletteOptions {
    toggle?: {
      foreground?: string
      background?: string
      border?: string
    }
  }
}

export const grey = {
  50: '#FFFFFF',
  100: '#F9FAFB',
  200: '#F4F6F8',
  300: '#DFE3E8',
  400: '#C4CDD5',
  500: '#919EAB',
  600: '#637381',
  700: '#454F5B',
  800: '#212B36',
  900: '#161C24',
}

export const customPallette = {
  toggleGrey: '#111928',
  nftfi: {
    tabBorder: '#676776',
    pageBackground: '#16152D',
    footerBackground: '#0B0B1A',
    footerFont: 'rgba(255, 255, 255, 0.8)',
    paper: '#221E37',
    rowDivider: '#383540',
    scrollbarThumb: '#3B3460',
    newLogoAccent: '#C93278',
    paperRecess: '#181628',
    active008alpha: '#29283E', // Hardcoding this color because it's a combination of our custom card background and our custom datagrid theme overrides: `backgroundColor: alpha(theme.palette.action.active, 0.08)`
  },
}

export const primary = {
  lighter: '#F6B2D4',
  light: '#DB73B1',
  main: '#CB2B83',
  dark: '#A11E69',
  darker: '#751548',
  contrastText: '#FFFFFF',
}

export const secondary = {
  lighter: '#EFD6FF',
  light: '#C684FF',
  main: '#8E33FF',
  dark: '#5119B7',
  darker: '#27097A',
  contrastText: '#FFFFFF',
}

export const info = {
  lighter: '#CAFDF5',
  light: '#61F3F3',
  main: '#00B8D9',
  dark: '#006C9C',
  darker: '#003768',
  contrastText: '#FFFFFF',
}

export const success = {
  lighter: '#D3FCD2',
  light: '#77ED8B',
  main: '#22C55E',
  dark: '#118D57',
  darker: '#065E49',
  contrastText: '#ffffff',
}

export const warning = {
  lighter: '#FFF5CC',
  light: '#FFD666',
  main: '#FFAB00',
  dark: '#B76E00',
  darker: '#7A4100',
  contrastText: grey[800],
}

export const error = {
  lighter: '#FFE9D5',
  light: '#FFAC82',
  main: '#FF5630',
  dark: '#B71D18',
  darker: '#7A0916',
  contrastText: '#FFFFFF',
}

export const common = {
  black: '#000000',
  white: '#FFFFFF',
}

export const action = {
  hover: alpha(grey[500], 0.08),
  selected: alpha(grey[500], 0.16),
  disabled: alpha(grey[500], 0.8),
  disabledBackground: alpha(grey[500], 0.24),
  focus: alpha(grey[500], 0.24),
  hoverOpacity: 0.08,
  disabledOpacity: 0.48,
}

const base = {
  primary,
  secondary,
  customPallette,
  info,
  success,
  warning,
  error,
  grey,
  common,
  divider: alpha(grey[500], 0.2),
  action,
}

export function palette(mode: 'light' | 'dark') {
  const light = {
    ...base,
    mode: 'light',
    text: {
      primary: grey[800],
      secondary: grey[600],
      disabled: grey[500],
    },
    background: {
      paper: '#FFFFFF',
      default: '#FFFFFF',
      neutral: grey[200],
      paperOffset: '#efeef6',
      header: '#2F2D45',
      tooltip: '#302B4D',
    },
    action: {
      ...base.action,
      active: grey[600],
    },
    toggle: {
      foreground: customPallette.toggleGrey,
      background: '#FFFFFF',
      border: grey[500],
    },
    label: grey[500],
    wallet: {
      base1: '#FFFFFF',
      base2: '',
      base4: '',
      listTileBackground: '',
      buttonPrimaryBackground: primary.light,
      dragHandle: '#41396B',
    },
  }

  const dark = {
    ...base,
    mode: 'dark',
    text: {
      primary: '#FFFFFF',
      secondary: grey[500],
      disabled: grey[600],
    },
    background: {
      paper: grey[800],
      default: customPallette.nftfi.pageBackground,
      neutral: alpha(grey[500], 0.12),
      paperOffset: '#312B4F',
      header: '#2F2D45',
      tooltip: '#302B4D',
    },
    action: {
      ...base.action,
      active: grey[500],
    },
    toggle: {
      foreground: '#FFFFFF',
      background: customPallette.toggleGrey,
      border: grey[600],
    },
    label: grey[500],
    wallet: {
      base1: customPallette.nftfi.pageBackground,
      base2: customPallette.nftfi.paper,
      base4: alpha(customPallette.nftfi.paper, 0.4),
      listTileBackground: customPallette.nftfi.paper,
      buttonPrimaryBackground: primary.main,
      dragHandle: '#41396B',
    },
    charts: {
      pink: '#CB2B83',
      yellow: '#FFD666',
      orange: '#E5A065',
      green: '#58B99E',
      blue: '#4884BC',
      lightBlue: '#99C1F2',
      purple: '#C684FF',
      darkPurple: '#5119B7',
      tonnedPurple: '#9A5FE0',
      lightPurple: '#E1A8F2',
      white: '#FFFFFF',
    },
  }

  return mode === 'light'
    ? light
    : dark
}

declare module '@mui/material/styles/createPalette' {
  interface Palette {
    toggle: {
      foreground: string
      background: string
      border: string
    }
    wallet: {
      base1: string
      base2: string
      base4: string
      listTileBackground: string
      buttonPrimaryBackground: string
      dragHandle: string
    }
    charts: {
      pink: string
      yellow: string
      orange: string
      green: string
      blue: string
      lightBlue: string
      purple: string
      darkPurple: string
      tonnedPurple: string
      lightPurple: string
      white: string
    }
    customPallette: {
      toggleGrey: string
      nftfi: {
        tabBorder: string
        pageBackground: string
        footerBackground: string
        footerFont: string
        paper: string
        rowDivider: string
        scrollbarThumb: string
        newLogoAccent: string
        paperRecess: string
        active008alpha?: string
      }
    }
  }

  interface PaletteOptions {
    toggle?: {
      foreground?: string
      background?: string
      border?: string
    }
    wallet?: {
      base1?: string
      base2?: string
      base4?: string
      listTileBackground?: string
      buttonPrimaryBackground?: string
      dragHandle?: string
    }
    customPallette?: {
      toggleGrey?: string
      nftfi?: {
        tabBorder?: string
        pageBackground?: string
        footerBackground?: string
        footerFont?: string
        paper?: string
      }
    }
  }
}
