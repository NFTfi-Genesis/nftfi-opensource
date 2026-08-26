import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import {
  ContactsSortType,
  ContactsSortDirection,
} from 'src/entities/domain/Contact'
import { getTestId } from 'src/utils/testing'

interface SortMenuProps {
  onSortAlphabetically: () => void
  onSortByDateAdded: () => void
  sortType: ContactsSortType
  sortDirection: ContactsSortDirection
}

function getSortIcon(
  sortType: ContactsSortType,
  sortDirection: ContactsSortDirection,
  currentSortType: ContactsSortType
) {
  const isSelected = sortType === currentSortType
  const isDescending
    = isSelected && sortDirection === ContactsSortDirection.Desc
  return isDescending
    ? 'ph:sort-descending'
    : 'ph:sort-ascending'
}

export function SortMenu({
  onSortAlphabetically,
  onSortByDateAdded,
  sortType,
  sortDirection,
}: SortMenuProps) {
  const { t } = useTranslation()
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setMenuAnchorEl(null)
  }

  return (
    <Box>
      <IconButton
        onClick={e => {
          e.stopPropagation()
          handleMenuOpen(e)
        }}
        {...getTestId('contacts.sort.menu')}
        sx={{ p: 1 }}
      >
        <Iconify icon='ph:sort-ascending' width={24} height={24} />
      </IconButton>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          sx={{ gap: 1.25 }}
          onClick={onSortAlphabetically}
          selected={sortType === ContactsSortType.Alphabetically}
          {...getTestId('contacts.sort.menu.alphabetically')}
        >
          <Iconify
            width={24}
            icon={getSortIcon(
              sortType,
              sortDirection,
              ContactsSortType.Alphabetically
            )}
          />
          <Typography variant='subtitle2'>
            {t('contacts.sort.alphabetically')}
          </Typography>
        </MenuItem>

        <MenuItem
          sx={{ gap: 1.25 }}
          onClick={onSortByDateAdded}
          selected={sortType === ContactsSortType.DateAdded}
          {...getTestId('contacts.sort.menu.dateAdded')}
        >
          <Iconify
            width={24}
            icon={getSortIcon(
              sortType,
              sortDirection,
              ContactsSortType.DateAdded
            )}
          />
          <Typography variant='subtitle2'>
            {t('contacts.sort.dateAdded')}
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
