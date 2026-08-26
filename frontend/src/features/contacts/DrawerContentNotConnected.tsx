import { Button, Stack, Typography } from '@mui/material'
import { useCallback } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { WalletButton } from 'src/components/Wallet/WalletButton'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { getTestId } from 'src/utils/testing'

export function DrawerContentNotConnected({
  refresh,
}: {
  refresh: () => void
}) {
  const { t } = useTranslation()
  const { authorize } = useAuth()
  const { isAuthenticated } = useAuth()
  const { isWalletAvailable } = useWallet()

  const handleAuthenticate = useCallback(async () => {
    try {
      await authorize()
      refresh()
    } catch {
      notify({
        message: t('error-messages.authenticate-failed'),
        variant: NotificationType.Error,
      })
    }
  }, [authorize, refresh, t])

  return (
    <Stack alignItems='center'>
      <Typography variant='h3' mt={9} mb={1.25}>
        {t(
          `contacts.${!isWalletAvailable
            ? 'walletNotConnected'
            : 'walletNotAuthenticated'}`
        )}
      </Typography>

      <Typography variant='body1' mb={5.25}>
        {t(
          `contacts.${!isWalletAvailable
            ? 'connectWalletToView'
            : 'authenticateWalletToView'}`
        )}
      </Typography>
      {!isWalletAvailable && <WalletButton />}
      {isWalletAvailable && !isAuthenticated && (
        <Button
          variant='outlined'
          onClick={handleAuthenticate}
          {...getTestId('common.login')}
        >
          {t('common.authenticate')}
        </Button>
      )}
    </Stack>
  )
}
