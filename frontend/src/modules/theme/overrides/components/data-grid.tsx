import { listClasses } from '@mui/material/List'
import { paperClasses } from '@mui/material/Paper'
import { Theme, alpha } from '@mui/material/styles'
import { buttonClasses } from '@mui/material/Button'
import { iconButtonClasses } from '@mui/material/IconButton'
import { inputLabelClasses } from '@mui/material/InputLabel'
import { formControlClasses } from '@mui/material/FormControl'
import { listItemIconClasses } from '@mui/material/ListItemIcon'
import { circularProgressClasses } from '@mui/material/CircularProgress'
import { tablePaginationClasses } from '@mui/material/TablePagination'

import { paper } from '../../css'

export function dataGrid(theme: Theme) {
  const paperStyles = paper({ theme, dropdown: true })

  return {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          '--unstable_DataGrid-radius': 0,
          '--unstable_DataGrid-headWeight': theme.typography.fontWeightSemiBold,
          '--DataGrid-containerBackground': theme.palette.background.header,
          borderWidth: 0,
        },
        withBorderColor: {
          borderColor: theme.palette.divider,
        },
        // Column
        columnHeaders: {
          borderBottom: 0,
        },
        columnHeader: {
          fontSize: 14,
          color: theme.palette.text.secondary,
          '&--sorted': {
            color: theme.palette.text.primary,
          },
          padding: `0 ${theme.spacing(2)}`,
          height: '56px !important',
          '&.logo-header': {
            padding: 0,
          },
          borderBottom: 'none !important',
        },
        columnSeparator: {
          color: theme.palette.divider,
        },
        // Row
        row: {
          borderBottom: `1px dashed ${theme.palette.divider}`,
        },
        // Row, Cell
        cell: {
          border: 'none',
          borderBottom: 'none',
          '&--editing': {
            boxShadow: 'none !important',
            backgroundColor: `${alpha(
              theme.palette.primary.main,
              0.08
            )} !important`,
          },
          padding: `0 ${theme.spacing(2)}`,
          '&.MuiDataGrid-cellEmpty': {
            display: 'none',
          },
        },
        toolbarContainer: {
          gap: theme.spacing(2),
          padding: theme.spacing(2),
        },
        toolbarQuickFilter: {
          padding: 0,
          width: '100%',
          [theme.breakpoints.up('md')]: {
            width: 'unset',
          },
        },
        // Paper
        paper: {
          ...paperStyles,
          padding: 0,
        },
        menu: {
          [`& .${paperClasses.root}`]: {
            ...paperStyles,
            minWidth: 140,
          },
          [`& .${listClasses.root}`]: {
            padding: 0,
            [`& .${listItemIconClasses.root}`]: {
              minWidth: 0,
              marginRight: theme.spacing(2),
            },
          },
        },
        // Icons
        menuIcon: {
          [`& .${iconButtonClasses.root}`]: {
            margin: theme.spacing(0, 1),
            padding: theme.spacing(0.25),
          },
        },
        iconButtonContainer: {
          [`& .${iconButtonClasses.root}`]: {
            padding: theme.spacing(0.25),
            marginLeft: theme.spacing(1),
          },
        },
        // Footer
        footerContainer: {
          minHeight: 'auto',
          border: 'none',
          height: '56px !important',
          [`& .${tablePaginationClasses.toolbar}`]: {
            height: '56px',
            '& .MuiIconButton-root': {
              transition: theme.transitions.create([
                'background-color',
                'opacity',
              ]),
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.active, 0.08),
                opacity: 0.8,
              },
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            },
            // Page size dropdown button
            '& .MuiSelect-select': {
              transition: theme.transitions.create([
                'background-color',
                'color',
                'opacity',
              ]),
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.active, 0.08),
                color: theme.palette.text.primary,
                opacity: 0.8,
              },
            },
            '& .MuiSelect-icon': {
              transition: theme.transitions.create(['color', 'opacity']),
              '&:hover': {
                color: theme.palette.text.primary,
                opacity: 0.8,
              },
            },
          },
        },
        selectedRowCount: {
          display: 'none',
          whiteSpace: 'nowrap',
        },
        overlay: {
          [`& .${circularProgressClasses.root}`]: {
            color: theme.palette.text.primary,
          },
        },
        // Columns Panel
        panelHeader: {
          padding: theme.spacing(2, 2, 0, 2),
        },
        panelContent: {
          padding: theme.spacing(1),
        },
        columnsPanelRow: {
          margin: theme.spacing(0.5, 0),
        },
        panelFooter: {
          display: 'none',
          gap: theme.spacing(1),
          padding: theme.spacing(2),
          justifyContent: 'flex-end',
          borderTop: `dashed 1px ${theme.palette.divider}`,
          [`& .${buttonClasses.root}`]: {
            padding: theme.spacing(0.5, 1.5),
            '&:first-of-type': {
              border: `solid 1px ${alpha(theme.palette.grey[500], 0.24)}`,
            },
            '&:last-of-type': {
              color: theme.palette.background.paper,
              backgroundColor: theme.palette.text.primary,
            },
          },
        },
        filterForm: {
          alignItems: 'center',
          gap: theme.spacing(1.5),
          padding: theme.spacing(1),
        },
        filterFormValueInput: {
          [`& .${formControlClasses.root}`]: {
            width: '100%',
          },
          [`& .${inputLabelClasses.root}`]: {
            transform: 'translate(14px, -9px) scale(0.75)',
          },
        },
      },
    },
  }
}
