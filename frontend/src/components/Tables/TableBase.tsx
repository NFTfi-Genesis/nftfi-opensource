import { ReactNode, useCallback, useMemo, useEffect, useRef } from 'react'
import { camelCase } from 'lodash'
import {
  DataGrid,
  GridCallbackDetails,
  GridColDef,
  GridRowClassNameParams,
  GridRowParams,
  GridValidRowModel,
  MuiEvent,
  GridCellParams,
  GridInitialState,
  GridDensity,
  GridColumnVisibilityModel,
} from '@mui/x-data-grid'
import { SxProps, Theme, Box, Typography, Stack, Tooltip, useTheme } from '@mui/material'
import { getTestId } from 'src/utils/testing'
import { Iconify } from 'src/components/Iconify'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { SortParams } from 'src/entities/app/SortParams'
import { DefaultToolbar } from './Toolbars/DefaultToolbar'
import { useColumnMinimizeState } from './useColumnMinimizeState'

export enum TablePageSizes {
  Size5 = 5,
  Size10 = 10,
  Size25 = 25,
  Size50 = 50,
  Size100 = 100,
}

export enum PaginationMode {
  CLIENT = 'client',
  SERVER = 'server',
}

// Define a custom column type that includes serverSortableField
export type ServerSortableColumn<TData extends GridValidRowModel = GridValidRowModel> = GridColDef<TData> & {
  serverSortableField?: string
  columnInfoTooltip?: React.ReactNode
}

export type TableBaseProps<
  TRowData extends GridValidRowModel,
  TRowContext extends Record<string, unknown> = Record<string, never>,
> = {
  rows: TRowData[]
  getRowId: (row: TRowData) => string
  columns: ServerSortableColumn<TRowData>[]
  context?: TRowContext
  title: string
  subtitle?: ReactNode
  showToolbar?: boolean
  loading?: boolean
  disableColumnMenu?: boolean
  paginationMode?: PaginationMode
  paginationModel?: PaginationParams
  onPaginationModelChange?: (model: PaginationParams) => void
  totalDataCount?: number
  initialState?: GridInitialState
  sx?: SxProps<Theme>
  toolbar?: () => ReactNode
  onRowClick?: (params: GridRowParams, event: MuiEvent, details: GridCallbackDetails) => void
  getRowClassName?: (params: GridRowClassNameParams) => string
  emptyState?: ReactNode
  sortingParams?: SortParams
  onSortChange?: (field: string) => void
  density?: GridDensity
  onDensityChange?: (density: GridDensity) => void
  columnVisibilityModel?: GridColumnVisibilityModel
  onColumnVisibilityModelChange?: (model: GridColumnVisibilityModel) => void
  hideColumnsWhenEmpty?: boolean
}

// Function to create a sortable header component (now private to this file)
function createSortableHeader(
  displayName: string,
  sortField: string,
  sortingParams: SortParams | undefined,
  onSortChange: ((field: string) => void) | undefined,
  align: 'left' | 'right' | 'center' = 'left',
  infoTooltip?: React.ReactNode
) {
  const isActive = sortingParams?.sortBy === sortField
  const sortIcon = isActive
    ? (
      <Iconify
        icon={sortingParams?.sortOrder === 'ASC'
          ? 'ph:arrow-up-bold'
          : 'ph:arrow-down-bold'}
        sx={{ ml: 0.7, width: 16 }}
      />
    )
    : null

  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='center'
      width='100%'
      height='100%'
      justifyContent={
        align === 'left'
          ? 'flex-start'
          : align === 'right'
            ? 'flex-end'
            : 'center'}
      sx={{
        cursor: onSortChange
          ? 'pointer'
          : 'default',
        '&:hover': {
          opacity: onSortChange
            ? 0.8
            : 1,
        },
      }}
      onClick={() => onSortChange && onSortChange(sortField)}
    >
      <Stack direction='row' alignItems='center' spacing={0.5}>
        {infoTooltip && (
          <Tooltip title={infoTooltip} placement='bottom'>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Iconify icon='ph:info' width={16} />
            </span>
          </Tooltip>
        )}
        <Typography variant='body2' component='span'>
          {displayName}
        </Typography>
      </Stack>
      {sortIcon}
    </Box>
  )
}

export function TableBase<
  TRowData extends GridValidRowModel,
  TRowContext extends Record<string, unknown> = Record<string, never>,
>({
  rows,
  getRowId,
  columns,
  title,
  subtitle,
  context,
  showToolbar = false,
  loading = false,
  disableColumnMenu = true,
  paginationMode = PaginationMode.CLIENT,
  paginationModel,
  onPaginationModelChange,
  totalDataCount,
  sx,
  toolbar: customToolbar,
  onRowClick,
  getRowClassName,
  emptyState,
  sortingParams,
  onSortChange,
  density,
  onDensityChange,
  columnVisibilityModel,
  onColumnVisibilityModelChange,
  hideColumnsWhenEmpty = false,
  ...props
}: TableBaseProps<TRowData, TRowContext>) {
  // Ref to store the last valid totalDataCount. Necessary to prevent resetting while clicking next page continuously, otherwise the pagination will randomly reset to the first page.
  const totalRowCountRef = useRef<number | undefined>(totalDataCount)
  const theme = useTheme()
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Detect minimize state for sticky-right-cell columns (once per table, not per row)
  const shouldMinimizeColumn = useColumnMinimizeState(tableContainerRef)

  // Update the ref when totalDataCount changes and is not undefined
  useEffect(() => {
    if (totalDataCount !== undefined) {
      totalRowCountRef.current = totalDataCount
    }
  },
  [totalDataCount])

  // Keep current data in ref
  const rowsWithContextPrev = useRef([] as TRowData[])
  // Keep current data in memo including when loading and data is empty array
  // but don't update data in ref so ref always holds the last data and is not reset while loading
  const rowsWithContext = useMemo(() => {
    const newRows = rows.map(row => ({ ...row, ...context }))
    if (!loading) rowsWithContextPrev.current = newRows
    return newRows
  },
  [context, rows, loading])
  // Display the data in ref while loading so it continues to show the "previous" data while fetching new one
  const displayedRows = useMemo(() => (loading
    ? rowsWithContextPrev.current
    : rowsWithContext),
  [rowsWithContext, loading])

  // Process columns to add custom renderHeader for server-sortable columns
  // and inject sticky state into sticky-right-cell-minimise columns
  const columnsWithSorting = useMemo(() => {
    const processColumn = (column: ServerSortableColumn<TRowData>) => {
      let processedColumn = column

      // Handle sorting and tooltips
      if (column.serverSortableField || column.columnInfoTooltip) {
        const headerName = column.headerName?.toString() || ''
        const align = column.headerAlign === 'right'
          ? 'right'
          : column.headerAlign === 'center'
            ? 'center'
            : 'left'

        processedColumn = {
          ...processedColumn,
          renderHeader: () =>
            createSortableHeader(
              headerName,
              column.serverSortableField || column.field,
              column.serverSortableField
                ? sortingParams
                : undefined,
              column.serverSortableField
                ? onSortChange
                : undefined,
              align,
              column.columnInfoTooltip
            ),
        }
      }

      // Inject minimize state into sticky-right-cell columns
      if (column.cellClassName === 'sticky-right-cell-minimise' && column.renderCell) {
        const originalRenderCell = column.renderCell
        processedColumn = {
          ...processedColumn,
          renderCell: params => {
            const originalElement = originalRenderCell(params)
            // Clone the element and inject isMinimised prop
            if (originalElement && typeof originalElement === 'object' && 'props' in originalElement) {
              return {
                ...originalElement,
                props: {
                  ...originalElement.props,
                  isMinimised: shouldMinimizeColumn,
                },
              }
            }
            return originalElement
          },
        }
      }

      return processedColumn
    }

    return columns.map(processColumn)
  },
  [columns, sortingParams, onSortChange, shouldMinimizeColumn])

  const gridStyles = useMemo(() => ({
    '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
      outline: 'none',
    },
    '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
      outline: 'none',
    },
    '& .MuiDataGrid-columnSeparator': { display: 'none' },
    '& .MuiDataGrid-row:last-child': { borderBottom: 'none' },
    '&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell': { py: '1px' },
    '&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell': { py: '5px' },
    '&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell': {
      py: '14px',
    },
    /* Cells */
    '& :is(.sticky-right-cell, .sticky-right-cell-minimise):has(.apply-sticky-right-cell)': {
      position: 'sticky',
      right: 0,
      backgroundColor: theme.palette.customPallette.nftfi.paper,
      zIndex: 1,
      overflow: 'visible',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-14px',
        width: '14px',
        height: '100%',
        background: `linear-gradient(to right, transparent, ${theme.palette.customPallette.nftfi.paper})`,
        pointerEvents: 'none',
        zIndex: 1,
      },
    },
    // When minimized, visually clip the cell to show only 60px
    ...(shouldMinimizeColumn && {
      '& .sticky-right-cell-minimise:has(.apply-sticky-right-cell)': {
        width: '60px',
        minWidth: '60px',
        maxWidth: '60px',
        overflow: 'hidden',
      },
    }),
    '& .MuiDataGrid-row:hover': {
      '& :is(.sticky-right-cell, .sticky-right-cell-minimise):has(.apply-sticky-right-cell)': {
        backgroundColor: theme.palette.customPallette.nftfi.active008alpha,
        '&::before': {
          background: `linear-gradient(to right, transparent, ${theme.palette.customPallette.nftfi.active008alpha})`,
        },
      },
    },
    '& .MuiDataGrid-row.selected-row': {
      backgroundColor: 'background.paperOffset',
      '& :is(.sticky-right-cell, .sticky-right-cell-minimise):has(.apply-sticky-right-cell)': {
        backgroundColor: theme.palette.background.paperOffset,
        '&::before': {
          background: `linear-gradient(to right, transparent, ${theme.palette.background.paperOffset})`,
        },
      },
    },
    ...(onRowClick && {
      '& .MuiDataGrid-row': {
        cursor: 'pointer',
      },
    }),
    ...sx,
  }),
  [sx, onRowClick, theme, shouldMinimizeColumn])

  const handlePaginationModelChange = useCallback((model: PaginationParams) => {
    onPaginationModelChange?.({ page: model.page, pageSize: model.pageSize })
  },
  [onPaginationModelChange])

  const pageSizeOptions = useMemo(() => Object.values(TablePageSizes).filter((value): value is number => typeof value === 'number'),
    [])

  const toolbarRenderRef = useRef<(() => ReactNode) | null>(null)
  const defaultToolbar = useMemo(() => () => <DefaultToolbar title={title} subtitle={subtitle} showToolbar={showToolbar} />,
    [title, subtitle, showToolbar])

  toolbarRenderRef.current = customToolbar ?? defaultToolbar
  const stableToolbarSlot = useMemo(() => {
    function StableToolbar() {
      // Render whatever is currently in the ref
      return toolbarRenderRef.current?.() ?? null
    }
    return StableToolbar
  }, [])

  const slots = useMemo(() => ({
    toolbar: stableToolbarSlot,
    ...(emptyState
      ? {
        noRowsOverlay: () => emptyState,
        // Same custom state when client-side filtering yields zero rows but the
        // dataset isn't empty — avoids MUI's default "No results found." text.
        noResultsOverlay: () => emptyState,
      }
      : {}),
  }),
  [stableToolbarSlot, emptyState])

  const slotProps = useMemo(() => ({
    loadingOverlay: {
      variant: 'linear-progress' as const,
      noRowsVariant: 'linear-progress' as const,
    },
    pagination: {
      slotProps: {
        actions: {
          previousButton: {
            ...getTestId('table.pagination.prev'),
          },
          nextButton: {
            ...getTestId('table.pagination.next'),
          },
        },
        select: {
          slotProps: {
            input: {
              ...getTestId('table.pagination.pageSize'),
            },
          },
        },
        displayedRows: {
          ...getTestId('table.pagination.displayedRows'),
        },
      },
    },
  }),
  [])

  const handleRowClick = useCallback((
    params: GridRowParams, event: MuiEvent<React.MouseEvent>, details: GridCallbackDetails
  ) => {
    const target = event.target as HTMLElement

    const isInteractiveElement
      = target.closest('button')
        || target.closest('a')
        || target.closest('input')
        || target.closest('select')
        || target.closest('[role="button"]')

    if (!isInteractiveElement && onRowClick) {
      onRowClick(
        params,
        event,
        details
      )
    }
  },
  [onRowClick])

  // Use the memoized rowCount value to prevent pagination reset
  const effectiveRowCount
    = paginationMode === PaginationMode.SERVER
      ? (loading
        ? totalRowCountRef.current
        : totalDataCount) || 0 // For server mode, use the stored total count
      : rowsWithContext.length || 0 // For client mode, use the actual row count

  const getRowHeight = useCallback(() => {
    return 'auto'
  },
  [])

  return (
    <Box ref={tableContainerRef} sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={displayedRows}
        getRowId={getRowId}
        columns={hideColumnsWhenEmpty && displayedRows.length === 0
          ? []
          : columnsWithSorting}
        loading={loading}
        slots={slots}
        slotProps={slotProps}
        getCellClassName={(params: GridCellParams<TRowData>) => `table.cell.${camelCase(params.field)}`}
        disableRowSelectionOnClick
        disableColumnMenu={disableColumnMenu}
        pageSizeOptions={pageSizeOptions}
        paginationMode={paginationMode}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationModelChange}
        rowCount={effectiveRowCount}
        getRowHeight={getRowHeight}
        sx={{
          ...gridStyles,
          // Make the DataGrid fill the container
          height: '100%',
          width: '100%',
          // Ensure all borders are visible
          border: 'none',
          '& .MuiDataGrid-main': {
            // Allow the body to be scrollable
            overflow: 'auto',
          },
        }}
        onRowClick={onRowClick
          ? handleRowClick
          : undefined}
        getRowClassName={getRowClassName}
        hideFooterPagination={effectiveRowCount === 0}
        density={density}
        onDensityChange={onDensityChange}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={onColumnVisibilityModelChange}
        aria-busy={loading}
        {...props}
      />
    </Box>
  )
}
