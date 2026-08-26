import { IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material'
import { useGridApiContext } from '@mui/x-data-grid'
import { memo, useState } from 'react'
import { Iconify } from 'src/components/Iconify'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import RowsFourSvg from 'src/assets/images/svg/rows-four.svg'
import RowsThreeSvg from 'src/assets/images/svg/rows-three.svg'
import { getTestId } from 'src/utils/testing'

export const DensitySelector = memo(function DensitySelector() {
  const apiRef = useGridApiContext()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const currentDensity = useTableDensity()

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDensityChange = (
    density: 'compact' | 'standard' | 'comfortable'
  ) => {
    apiRef.current.setDensity(density)
    handleClose()
  }

  return (
    <>
      <IconButton onClick={handleClick} {...getTestId('table.toolbar.density')}>
        <Iconify icon='ph:rows' />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => handleDensityChange('compact')}
          selected={currentDensity === 'compact'}
        >
          <ListItemIcon>
            <RowsFourSvg width={20} height={20} />
          </ListItemIcon>
          Compact
        </MenuItem>
        <MenuItem
          onClick={() => handleDensityChange('standard')}
          selected={currentDensity === 'standard'}
        >
          <ListItemIcon>
            <RowsThreeSvg width={20} height={20} />
          </ListItemIcon>
          Standard
        </MenuItem>
        <MenuItem
          onClick={() => handleDensityChange('comfortable')}
          selected={currentDensity === 'comfortable'}
        >
          <ListItemIcon>
            <Iconify icon='ph:rows-light' />
          </ListItemIcon>
          Comfortable
        </MenuItem>
      </Menu>
    </>
  )
})
