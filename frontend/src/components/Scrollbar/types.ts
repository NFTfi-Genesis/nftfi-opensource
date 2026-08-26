import { SimpleBarProps } from 'simplebar-react'

import { Theme, SxProps } from '@mui/material/styles'

// ----------------------------------------------------------------------

export interface ScrollbarProps extends SimpleBarProps {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}
