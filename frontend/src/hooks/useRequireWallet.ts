import { useCallback } from 'react'
import { NotificationType, notify } from 'src/modules/notifications/notify'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useTranslation } from 'src/modules/translation/useTranslation'

export function useRequireWallet() {
  const { walletAddress } = useWallet()
  const { t } = useTranslation()
  const requireWallet = useCallback((action: () => void) => {
    if (!walletAddress) {
      notify({
        message: t('common.connect-wallet-to-continue'),
        variant: NotificationType.Warning,
      })
      return
    }
    action()
  }, [walletAddress, t])

  return requireWallet
}
