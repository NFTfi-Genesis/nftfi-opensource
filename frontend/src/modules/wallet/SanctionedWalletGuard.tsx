import { useEffect } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { notify, NotificationType } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useSanctioned } from 'src/services/hooks/account/useSanctioned'

// Blocks sanctioned wallets: when the connected (or impersonated) wallet is
// flagged by the accounts service, show a toast and disconnect it.
// Fails open — only a confirmed `flagged === true` triggers the block.
export function SanctionedWalletGuard() {
  const { handleLogOut } = useDynamicContext()
  const { t } = useTranslation()
  const { data: flagged } = useSanctioned()

  useEffect(() => {
    if (flagged === true) {
      notify({
        message: t('common.sanctioned-wallet-warning'),
        variant: NotificationType.Error,
        duration: 10000,
      })
      handleLogOut()
    }
  }, [flagged, handleLogOut, t])

  return null
}
