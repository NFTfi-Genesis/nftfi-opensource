import { Button } from '@mui/material'
import { SxProps, Theme, alpha } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Iconify } from 'src/components/Iconify'
import { grey } from 'src/modules/theme/palette'
import { getTestId } from 'src/utils/testing'

interface AddContactButtonProps {
  onAddContact: () => void
  sx?: SxProps<Theme>
}

export function AddContactButton({
  onAddContact,
  sx,
}: AddContactButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant='outlined'
      startIcon={<Iconify icon='ph:plus' />}
      onClick={onAddContact}
      sx={{
        height: 80,
        borderRadius: '200000px',
        borderColor: alpha(grey[500], 0.32),
        '&:hover': {
          borderColor: alpha(grey[500], 0.32),
        },
        ...sx,
      }}
      {...getTestId('contacts.add')}
    >
      {t('contacts.addContact')}
    </Button>
  )
}
