import { Stack, Typography, Button } from '@mui/material'
import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { notify, NotificationType } from 'src/modules/notifications/notify'
import { getTestId } from 'src/utils/testing'

export function LoginWarning({ message }: { message?: string }) {
  const { authorize } = useAuth()
  const { t } = useTranslation()

  const handleLogin = useCallback(async () => {
    try {
      await authorize()
    } catch (error) {
      console.error(error)
      notify({
        message: 'Failed to login',
        variant: NotificationType.Error,
      })
    }
  }, [authorize])

  return (
    <Stack
      display='flex'
      alignItems='center'
      justifyContent='center'
      height='100%'
      gap={3}
    >
      <Typography variant='h3'>
        {message ?? 'To view this section, please login'}
      </Typography>
      <Button
        sx={theme => ({
          border: `1px solid ${theme.palette.text.primary}`,
          color: theme.palette.text.primary,
        })}
        onClick={handleLogin}
        {...getTestId('common.login')}
      >
        {t('dynamic.login')}
      </Button>
    </Stack>
  )
}
