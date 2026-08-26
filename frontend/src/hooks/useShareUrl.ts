import { useCallback } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { notify, NotificationType } from 'src/modules/notifications/notify'

export function useShareUrl() {
  const { t } = useTranslation()
  return useCallback(async () => {
    try {
      const currentUrl = window.location.href
      await navigator.clipboard.writeText(currentUrl)
      notify({
        message: t('info-messages.share-url'),
        variant: NotificationType.Info,
      })
    } catch (error) {
      console.error(error)
      notify({
        message: t('warning-messages.not-copied'),
        variant: NotificationType.Warning,
      })
    }
  }, [t])
}
