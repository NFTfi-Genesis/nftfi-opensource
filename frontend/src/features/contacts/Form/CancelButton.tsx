import { Button } from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Iconify } from 'src/components/Iconify'
import { getTestId } from 'src/utils/testing'

interface CancelButtonProps {
  onClick: () => void
}

export function CancelButton({ onClick }: CancelButtonProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Button
      variant='outlined'
      fullWidth
      onClick={onClick}
      startIcon={<Iconify icon='ph:x' />}
      {...getTestId('contacts.form.cancel')}
      sx={{
        height: 36,
        borderRadius: '500px',
        background: alpha(theme.palette.text.primary, 0.08),
        border: 'none',
      }}
    >
      {t('contacts.cancel')}
    </Button>
  )
}
