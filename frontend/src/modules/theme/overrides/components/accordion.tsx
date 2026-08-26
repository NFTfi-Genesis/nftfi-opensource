import { Theme } from '@mui/material/styles'
import { accordionClasses } from '@mui/material/Accordion'
import { typographyClasses } from '@mui/material/Typography'
import { accordionSummaryClasses } from '@mui/material/AccordionSummary'

export function accordion(theme: Theme) {
  return {
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          [`&.${accordionClasses.expanded}`]: {
            boxShadow: theme.customShadows.z8,
            borderRadius: theme.shape.borderRadius,
            marginTop: 0,
            marginBottom: 0,
          },
          [`&.${accordionClasses.disabled}`]: {
            backgroundColor: 'transparent',
          },
          '&::before': {
            display: 'none',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(1),
          boxShadow: theme.customShadows.z8,
          borderRadius: theme.shape.borderRadius,
          fontWeight: theme.typography.fontWeightSemiBold,
          minHeight: 48, // Ensures consistent height
          [`&.${accordionSummaryClasses.expanded}`]: {
            minHeight: 48, // Same minHeight when expanded
            boxShadow: 'none',
          },
          [`&.${accordionSummaryClasses.disabled}`]: {
            opacity: 1,
            color: theme.palette.action.disabled,
            [`& .${typographyClasses.root}`]: {
              color: 'inherit',
            },
          },
        },
        expandIconWrapper: {
          color: 'inherit',
        },
        content: {
          margin: 0,
          minHeight: 48, // Ensure consistent content height
          alignItems: 'center', // Vertically center content
          [`&.${accordionSummaryClasses.expanded}`]: {
            margin: 0,
            minHeight: 48,
          },
        },
      },
    },
  }
}
