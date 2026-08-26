import { GridValidRowModel } from '@mui/x-data-grid'
import { TableBase, TableBaseProps, TablePageSizes } from './TableBase'

export function TableNoPagination<
  TRowData extends GridValidRowModel,
  TRowContext extends Record<string, unknown> = Record<string, never>,
>(props: TableBaseProps<TRowData, TRowContext>) {
  const pageSize
    = props.rows.length > 0
      ? props.rows.length
      : TablePageSizes.Size5

  return (
    <TableBase<TRowData, TRowContext>
      {...props}
      paginationModel={{
        pageSize,
        page: 0,
      }}
      sx={{ '& .MuiDataGrid-footerContainer': { display: 'none' } }}
    />
  )
}
