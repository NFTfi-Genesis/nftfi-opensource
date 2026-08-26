import { Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Iconify } from 'src/components/Iconify'
import { getTestId } from 'src/utils/testing'

interface AddWalletButtonProps {
  onClick: () => void
}

export function AddWalletButton({ onClick }: AddWalletButtonProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Button
      onClick={onClick}
      startIcon={<Iconify icon='ph:plus' />}
      sx={{
        color: theme.palette.text.secondary,
        '&:hover': {
          color: theme.palette.text.primary,
          background: 'transparent',
        },
        width: 'fit-content',
        alignSelf: 'center',
      }}
      {...getTestId('contacts.form.addWallet')}
    >
      {t('contacts.addAdditionalWallet')}
    </Button>
  )
}
