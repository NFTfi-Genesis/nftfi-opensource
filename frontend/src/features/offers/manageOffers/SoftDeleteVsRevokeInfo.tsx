import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'

export function SoftDeleteVsRevokeInfo() {
  const { t } = useTranslation()
  return (
    <Stack direction='column' spacing={1} sx={{ textAlign: 'center' }}>
      <Stack direction='column' spacing={0.3}>
        <Typography variant='caption' fontWeight='bold' color='text.primary'>
          {t('custom-table-columns.soft-delete-vs-revoke-info.soft-delete')}
        </Typography>
        <Typography variant='caption' fontWeight='regular' color='text.primary'>
          {t('custom-table-columns.soft-delete-vs-revoke-info.soft-delete-description')}
        </Typography>
      </Stack>
      <Stack direction='column' spacing={0.3}>
        <Typography variant='caption' fontWeight='bold' color='text.primary'>
          {t('custom-table-columns.soft-delete-vs-revoke-info.revoke')}
        </Typography>
        <Typography variant='caption' fontWeight='regular' color='text.primary'>
          {t('custom-table-columns.soft-delete-vs-revoke-info.revoke-description')}
        </Typography>
      </Stack>
    </Stack>
  )
}
