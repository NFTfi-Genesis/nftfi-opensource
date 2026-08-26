import { Theme, alpha } from '@mui/material/styles'
import { tableRowClasses } from '@mui/material/TableRow'
import { tableCellClasses } from '@mui/material/TableCell'

// ----------------------------------------------------------------------

export function table(theme: Theme) {
  return {
    MuiTableContainer: {
      styleOverrides: {
        root: {
          position: 'relative',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          [`&.${tableRowClasses.selected}`]: {
            backgroundColor: alpha(theme.palette.primary.dark, 0.04),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.dark, 0.08),
            },
          },
          '&:last-of-type': {
            [`& .${tableCellClasses.root}`]: {
              borderColor: 'transparent',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomStyle: 'dashed',
        },
        head: {
          fontSize: 14,
          color: theme.palette.text.secondary,
          fontWeight: theme.typography.fontWeightSemiBold,
          backgroundColor: theme.palette.background.neutral,
        },
        stickyHeader: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: `linear-gradient(to bottom, ${theme.palette.background.neutral} 0%, ${theme.palette.background.neutral} 100%)`,
        },
        paddingCheckbox: {
          paddingLeft: theme.spacing(1),
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          width: '100%',
          '& .MuiInputBase-root.MuiTablePagination-select': {
            display: 'inline-flex !important',
          },
          '& .MuiInputBase-root.MuiInputBase-colorPrimary.MuiTablePagination-select':
            {
              display: 'inline-flex !important',
            },
          '@media (max-width: 900px)': {
            '& .MuiInputBase-root.MuiInputBase-colorPrimary.MuiTablePagination-select':
              {
                display: 'inline-flex !important',
              },
            '& .MuiTablePagination-select': {
              display: 'inline-flex !important',
            },
            '& .MuiSelect-root.MuiTablePagination-input': {
              display: 'inline-flex !important',
            },
          },
        },
        toolbar: {
          height: 64,
          '@media (max-width: 900px)': {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'nowrap',
          },
        },
        actions: {
          marginRight: 8,
          '@media (max-width: 900px)': {
            marginLeft: 0,
            marginRight: 8,
          },
        },
        spacer: {
          '@media (max-width: 900px)': {
            flex: '0 1 auto',
          },
        },
        select: {
          paddingLeft: 8,
          '&:focus': {
            borderRadius: theme.shape.borderRadius,
          },
          display: 'inline-flex !important',
          '@media (max-width: 900px)': {
            display: 'inline-flex !important',
            minWidth: '3rem',
            marginRight: 0,
          },
        },
        selectIcon: {
          right: 4,
          width: 16,
          height: 16,
          top: 'calc(50% - 8px)',
          display: 'inline-flex !important',
          '@media (max-width: 900px)': {
            display: 'inline-flex !important',
          },
        },
        selectLabel: {
          display: 'block !important',
          '@media (max-width: 900px)': {
            display: 'block !important',
            marginRight: theme.spacing(1),
          },
        },
        input: {
          marginRight: theme.spacing(2),
          marginLeft: theme.spacing(1),
          '@media (max-width: 900px)': {
            marginRight: theme.spacing(1),
            marginLeft: theme.spacing(1),
            display: 'inline-flex !important',
          },
        },
        displayedRows: {
          '@media (max-width: 900px)': {
            display: 'block !important',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.MuiTablePagination-select': {
            display: 'inline-flex !important',
            '@media (max-width: 900px)': {
              display: 'inline-flex !important',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '&.MuiTablePagination-input': {
            display: 'inline-flex !important',
            '@media (max-width: 900px)': {
              display: 'inline-flex !important',
            },
          },
        },
      },
    },
  }
}
