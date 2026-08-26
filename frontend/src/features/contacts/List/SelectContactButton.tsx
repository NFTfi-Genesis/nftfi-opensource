import { Link } from 'react-router-dom'
import { Button, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Contact } from 'src/entities/domain/Contact'
import { getTestId } from 'src/utils/testing'

interface SelectContactButtonProps {
  contact: Contact
}

export function SelectContactButton({
  contact,
}: SelectContactButtonProps) {
  const theme = useTheme()
  const { t } = useTranslation()

  const walletAddresses = contact.addresses.map(addr => addr.value)

  return (
    <Button
      {...getTestId('contacts.contact.viewLoanActivity')}
      component={Link}
      to={`/market/active-loans?wallets=${walletAddresses.join(',')}`}
      startIcon={<Iconify icon='ph:arrow-square-out' />}
      fullWidth
      sx={{
        background: alpha(theme.palette.grey[50], 0.08),
        color: theme.palette.grey[50],
        borderRadius: '40px',
        mt: 1,
      }}
    >
      {t('contacts.selectContact')}
    </Button>
  )
}
