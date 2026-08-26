import React, { useEffect, useRef } from 'react'
import { Box, useTheme } from '@mui/material'
import { useJazzIconAvatar } from 'src/hooks/useJazzIconAvatar'
import { Address } from 'src/entities/base/Address'

interface JazzIconAvatarProps {
  address: Address
  diameter: number
  noBorder?: boolean
}

export const JazzIconAvatar: React.FC<JazzIconAvatarProps> = ({
  address,
  diameter,
  noBorder,
}) => {
  const theme = useTheme()
  const iconRef = useRef<HTMLDivElement>(null)

  useJazzIconAvatar(iconRef, address, diameter)

  useEffect(() => {
    const svgElement = iconRef.current?.querySelector('svg')
    if (svgElement) {
      svgElement.style.width = `${diameter}px`
      svgElement.style.height = `${diameter}px`
      svgElement.style.borderRadius = '50%'
    }
  }, [diameter])

  return (
    <Box
      ref={iconRef}
      sx={{
        alignSelf: 'center',
      }}
      style={{
        width: diameter,
        height: diameter,
        overflow: 'hidden',
        borderRadius: '50%',
        border: noBorder
          ? 'none'
          : `2px solid ${theme.palette.text.primary}`,
      }}
    />
  )
}
