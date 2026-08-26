export function remToPx(value: string) {
  return Math.round(parseFloat(value) * 16)
}

export function pxToRem(value: number) {
  return `${value / 16}rem`
}

export function responsiveFontSizes({
  sm,
  md,
  lg,
}: {
  sm: number
  md: number
  lg: number
}) {
  return {
    '@media (min-width:600px)': {
      fontSize: pxToRem(sm),
    },
    '@media (min-width:900px)': {
      fontSize: pxToRem(md),
    },
    '@media (min-width:1200px)': {
      fontSize: pxToRem(lg),
    },
  }
}

declare module '@mui/material/styles' {
  interface TypographyVariants {
    fontSecondaryFamily: React.CSSProperties['fontFamily']
    fontWeightSemiBold: React.CSSProperties['fontWeight']
    mono1: React.CSSProperties
    mono2: React.CSSProperties
    mono3: React.CSSProperties
    mono4: React.CSSProperties
    captionMono: React.CSSProperties
    caption2: React.CSSProperties
    chartLabel: React.CSSProperties
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono1: true
    mono2: true
    mono3: true
    mono4: true
    captionMono: true
    caption2: true
    chartLabel: true
  }
}

export const primaryFont = 'Public Sans, sans-serif'
export const secondaryFont = 'Roboto Mono, monospace'

export const typography = {
  fontFamily: primaryFont,
  fontSecondaryFamily: secondaryFont,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
  h1: {
    fontWeight: 800,
    lineHeight: 80 / 64,
    fontSize: pxToRem(64),
    // ...responsiveFontSizes({ sm: 52, md: 58, lg: 64 }),
  },
  h2: {
    fontWeight: 800,
    lineHeight: 64 / 48,
    fontSize: pxToRem(32),
    ...responsiveFontSizes({ sm: 40, md: 44, lg: 48 }),
  },
  h3: {
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(24),
    // ...responsiveFontSizes({ sm: 26, md: 30, lg: 32 }),
  },
  h4: {
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(20),
    // ...responsiveFontSizes({ sm: 20, md: 24, lg: 24 }),
  },
  h5: {
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(18),
    // ...responsiveFontSizes({ sm: 19, md: 20, lg: 20 }),
  },
  h6: {
    fontWeight: 700,
    lineHeight: 28 / 18,
    fontSize: pxToRem(17),
    ...responsiveFontSizes({ sm: 18, md: 18, lg: 18 }),
  },
  subtitle1: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: pxToRem(16),
  },
  subtitle2: {
    fontWeight: 600,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
  },
  body1: {
    lineHeight: 1.5,
    fontSize: pxToRem(16),
  },
  body2: {
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
  },
  caption: {
    fontFamily: secondaryFont,
    fontSize: pxToRem(12),
    color: 'text.secondary',
  },
  caption2: {
    fontSize: pxToRem(14),
    fontWeight: 300,
  },
  captionMono: {
    fontFamily: secondaryFont,
    fontSize: pxToRem(11),
    fontWeight: 300,
  },
  overline: {
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(12),
    textTransform: 'uppercase',
  },
  button: {
    fontWeight: 700,
    lineHeight: 24 / 14,
    fontSize: pxToRem(14),
    textTransform: 'unset',
  },
  mono1: {
    fontFamily: secondaryFont,
    fontSize: pxToRem(14),
    fontStyle: 'normal',
    fontWeight: 300,
    lineHeight: '22px',
  },
  mono2: {
    fontFamily: secondaryFont,
    fontSize: pxToRem(12),
    fontStyle: 'normal',
    fontWeight: 300,
    lineHeight: '20px',
  },
  mono3: {
    fontFamily: secondaryFont,
    fontSize: pxToRem(13),
    fontStyle: 'normal',
    fontWeight: 700,
    lineHeight: '22px',
  },
  mono4: {
    fontFamily: secondaryFont,
    fontSize: pxToRem(16),
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: '22px',
  },
  chartLabel: {
    fontSize: pxToRem(13),
    fontWeight: 500,
    lineHeight: '22px',
  },
} as const
