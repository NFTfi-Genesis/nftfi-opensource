import React from 'react'
import { Iconify } from 'src/components/Iconify'

interface NavIconProps {
  iconSvg?: React.ReactElement
  icon?: string
}

export const NavIcon = (item: NavIconProps, color?: string) => {
  if (item.iconSvg) {
    return React.cloneElement(item.iconSvg, {
      width: 22,
      height: 22,
      style: { color: color || 'currentColor' },
    })
  }

  return (
    <Iconify
      icon={item.icon || ''}
      width={22}
      color={color || 'currentColor'}
    />
  )
}
