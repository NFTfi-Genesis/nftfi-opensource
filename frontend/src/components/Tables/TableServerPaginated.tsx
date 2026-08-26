import { useMemo } from 'react'
import { GridDensity, GridColumnVisibilityModel, GridInitialState, GridValidRowModel } from '@mui/x-data-grid'
import { SortParams } from 'src/entities/app/SortParams'
import { TableBase, TableBaseProps, PaginationMode } from './TableBase'

export function TableServerPaginated<
  TRowData extends GridValidRowModel,
  TRowContext extends Record<string, unknown> = Record<string, never>,
>(
  props: TableBaseProps<TRowData, TRowContext> & {
    currentPage: number
    currentPageSize: number
    totalDataCount: number
    sortingParams?: SortParams
    onSortChange?: (field: string) => void
    density?: GridDensity
    onDensityChange?: (density: GridDensity) => void
    columnVisibilityModel?: GridColumnVisibilityModel
    onColumnVisibilityModelChange?: (model: GridColumnVisibilityModel) => void
    initialState?: GridInitialState
    hideColumnsWhenEmpty?: boolean
  }
) {
  const {
    currentPage,
    currentPageSize,
    onPaginationModelChange,
    totalDataCount,
    getRowId,
    loading,
    sortingParams,
    onSortChange,
    columns,
    density,
    onDensityChange,
    columnVisibilityModel,
    onColumnVisibilityModelChange,
    initialState: propsInitialState,
    ...restProps
  } = props

  const columnsDisabledDefaultSorting = useMemo(() => {
    return columns.map(column => ({
      ...column,
      sortable: false, // Universally disabling MUI's default client-side sorting for server-paginated tables
    }))
  }, [columns])

  const memoPaginationModel = useMemo(
    () => ({
      page: currentPage,
      pageSize: currentPageSize,
    }),
    [currentPage, currentPageSize]
  )

  const memoInitialState = useMemo(
    () => ({
      ...propsInitialState,
      pagination: {
        paginationModel: {
          page: currentPage,
          pageSize: currentPageSize,
        },
      },
    }),
    [propsInitialState, currentPage, currentPageSize]
  )

  const total = useMemo(() => {
    if (!loading) {
      return totalDataCount
    }
  }, [totalDataCount, loading])

  return (
    <TableBase<TRowData, TRowContext>
      {...restProps}
      columns={columnsDisabledDefaultSorting}
      loading={loading}
      initialState={memoInitialState}
      getRowId={getRowId}
      paginationMode={PaginationMode.SERVER}
      paginationModel={memoPaginationModel}
      onPaginationModelChange={onPaginationModelChange}
      totalDataCount={total}
      sortingParams={sortingParams}
      onSortChange={onSortChange}
      density={density}
      onDensityChange={onDensityChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityModelChange={onColumnVisibilityModelChange}
    />
  )
}
