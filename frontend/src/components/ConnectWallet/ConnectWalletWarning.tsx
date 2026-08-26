import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { WalletButton } from '../Wallet/WalletButton'

export function ConnectWalletWarning() {
  const { t } = useTranslation()

  return (
    <Stack
      display='flex'
      alignItems='center'
      justifyContent='center'
      height='100%'
      gap={3}
    >
      <Typography variant='h3'>{t('common.connect-wallet-warning')}</Typography>
      <WalletButton />
    </Stack>
  )
}
