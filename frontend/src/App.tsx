import { Box, Stack } from '@mui/material'
import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { closeSnackbar } from 'notistack'
import { ActionButton } from 'src/components/ActionButton'
import { notify, NotificationType } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { appRoutes } from 'src/routes/AppRoutes'
import { checkGdprConsent, setGdprConsent } from 'src/utils/gdpr'
import { GoogleAnalytics } from 'src/components/Analytics/GoogleAnalytics'

export function App() {
  const routes = useRoutes(appRoutes)
  const gdprConsent = checkGdprConsent()
  const { t } = useTranslation()

  const handleGdprConsent = (consent: boolean) => {
    setGdprConsent(consent)
    closeSnackbar('gdpr')
  }

  useEffect(() => {
    if (gdprConsent === null) {
      notify({
        id: 'gdpr',
        message: t('error-messages.gdpr-consent-required'),
        variant: NotificationType.Warning,
        duration: 3600000,
        action: [
          <Box display='flex' flexDirection='row' gap={1}>
            <ActionButton
              onClick={() => handleGdprConsent(true)}
              color='warning'
            >
              {t('error-messages.gdpr-consent-accept')}
            </ActionButton>
            <ActionButton
              onClick={() => handleGdprConsent(false)}
              variant='outlined'
            >
              {t('error-messages.gdpr-consent-decline')}
            </ActionButton>
          </Box>,
        ],
      })
    }
  }, [gdprConsent, t])

  return (
    <Stack minHeight='100vh' width='100%' alignItems='center'>
      <GoogleAnalytics />
      {routes}
    </Stack>
  )
}
