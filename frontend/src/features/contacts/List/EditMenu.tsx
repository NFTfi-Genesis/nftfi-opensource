import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'

interface EditMenuProps {
  onDelete: () => void
  onEdit: () => void
}

export function EditMenu({ onDelete, onEdit }: EditMenuProps) {
  const { t } = useTranslation()
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setMenuAnchorEl(null)
  }

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    onDelete()
    handleMenuClose(e)
  }

  const handleEdit = (e: React.MouseEvent<HTMLElement>) => {
    onEdit()
    handleMenuClose(e)
  }

  return (
    <Box>
      <IconButton
        onClick={e => {
          e.stopPropagation()
          handleMenuOpen(e)
        }}
        sx={{ p: 1 }}
        {...getTestId('contacts.edit.menu')}
      >
        <Iconify icon='ph:dots-three-vertical' width={24} />
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
          onClick={handleEdit}
          {...getTestId('contacts.edit.menu.edit')}
        >
          <Iconify width={24} icon='ph:pencil' />
          <Typography variant='subtitle2'>{t('contacts.edit')}</Typography>
        </MenuItem>

        <MenuItem
          sx={{ gap: 1.25 }}
          onClick={handleDelete}
          {...getTestId('contacts.edit.menu.delete')}
        >
          <Iconify width={24} icon='ph:trash' />
          <Typography variant='subtitle2'>{t('contacts.delete')}</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
