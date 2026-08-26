import { Button } from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Iconify } from 'src/components/Iconify'

interface CreateButtonProps {
  disabled?: boolean
}

export function CreateButton({ disabled }: CreateButtonProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Button
      type='submit'
      variant='contained'
      fullWidth
      disabled={disabled}
      startIcon={<Iconify icon='ph:floppy-disk' />}
      sx={{
        height: 36,
        borderRadius: '500px',
        background: alpha(theme.palette.primary.main, 0.08),
        border: 'none',
        color: theme.palette.primary.light,
        '&:hover': {
          background: alpha(theme.palette.primary.main, 0.12),
          border: 'none',
        },
      }}
    >
      {t('contacts.saveChanges')}
    </Button>
  )
}
