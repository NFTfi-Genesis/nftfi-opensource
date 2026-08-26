import { memo } from 'react'
import { Typography } from '@mui/material'

export type NumberCellProps = { number: string | number }

export const NumberCell = memo(function NumberCell({
  number,
}: NumberCellProps) {
  return <Typography variant='mono1'>{number}</Typography>
})
