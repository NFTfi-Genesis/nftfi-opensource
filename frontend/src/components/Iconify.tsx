import { forwardRef } from 'react'
import { Box, BoxProps } from '@mui/material'
import { Icon, IconifyIcon } from '@iconify/react'

interface Props extends BoxProps {
  icon: IconifyIcon | string
}

export const Iconify = forwardRef<SVGElement, Props>(
  ({ icon, width = 20, sx, ...other }, ref) => (
    <Box
      ref={ref}
      component={Icon}
      className='component-iconify'
      icon={icon}
      sx={{ width, height: width, ...sx }}
      {...other}
    />
  )
)
