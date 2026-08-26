import { memo } from 'react'
import { Stack } from '@mui/material'
import { Loading } from 'src/components/Loading'

export type LoadingCellProps = {
  size?: number
  align?: 'left' | 'center' | 'right'
}

export const LoadingCell = memo(function LoadingCell(props: LoadingCellProps) {
  const { size = 28, align = 'center' } = props
  return <Stack height='100%' width='100%' justifyContent='center' alignItems={align === 'left'
    ? 'flex-start'
    : align === 'right'
      ? 'flex-end'
      : 'center'}>
    <Loading
      color='inherit'
      size={size}
    />
  </Stack>
})
