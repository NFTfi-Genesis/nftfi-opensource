import { Card, CardProps, SxProps, Theme } from '@mui/material'
import { useMemo } from 'react'

export type PanelProps = CardProps & {
  fullWidth?: boolean
  width?: string | number
  fullHeight?: boolean
  height?: string | number
  straightLeftEdge?: boolean
  straightRightEdge?: boolean
  mobile?: boolean
  noPadding?: boolean
  sx?: SxProps<Theme>
  children: React.ReactNode
}

export function Panel({
  fullWidth = false,
  fullHeight = false,
  width,
  height,
  straightLeftEdge = false,
  straightRightEdge = false,
  mobile = false,
  noPadding = false,
  sx = {},
  children,
  ...other
}: PanelProps) {
  const borderRadiusSx = useMemo(() => {
    let sx = {}
    if (straightLeftEdge) {
      sx = {
        ...sx,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      }
    }
    if (straightRightEdge) {
      sx = {
        ...sx,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }
    }
    if (mobile) {
      return { borderRadius: 0 }
    }
    return sx
  }, [straightLeftEdge, straightRightEdge, mobile])

  const widthSx = useMemo(() => {
    if (fullWidth) {
      return { width: '100%' }
    } else if (width) {
      return { width }
    }
    return {}
  }, [fullWidth, width])

  const heightSx = useMemo(() => {
    if (fullHeight) {
      return { height: '100%' }
    } else if (height) {
      return { height }
    }
    return {}
  }, [fullHeight, height])

  const paddingSx = useMemo(() => {
    if (noPadding) {
      return { padding: 0 }
    }
    return {}
  }, [noPadding])

  return (
    <Card
      sx={{
        ...borderRadiusSx,
        ...widthSx,
        ...heightSx,
        ...paddingSx,
        ...sx,
      }}
      {...other}
    >
      {children}
    </Card>
  )
}
