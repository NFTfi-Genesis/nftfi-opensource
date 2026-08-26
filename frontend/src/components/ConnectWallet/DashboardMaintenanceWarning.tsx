import { Button, Card, Stack, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'

export function DashboardMaintenanceWarning() {
  const { t } = useTranslation()

  return (
    <Card sx={{ flex: 1, height: '100%' }}>
      <Stack
        display='flex'
        alignItems='center'
        justifyContent='center'
        height='100%'
        gap={3}
        sx={{ textAlign: 'center', px: 3 }}
      >
        <Typography variant='h3'>
          {t('warning-messages.dashboard-maintenance-header')}
        </Typography>
        <Typography
          variant='body1'
          color='text.secondary'
          sx={{ maxWidth: 400 }}
        >
          {t('warning-messages.dashboard-maintenance-description')}
        </Typography>
        <Button
          variant='outlined'
          size='large'
          onClick={() => {
            window.location.href = '/loans'
          }}
          sx={{ mt: 1 }}
        >
          {t('warning-messages.dashboard-maintenance-cta')}
        </Button>
      </Stack>
    </Card>
  )
}
