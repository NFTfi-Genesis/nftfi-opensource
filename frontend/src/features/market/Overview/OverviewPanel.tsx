import { Box, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Scrollbar } from 'src/components/Scrollbar/Scrollbar'
import { Overview } from './Overview'

export function OverviewPanel() {
  const { t } = useTranslation()

  return (
    <Box display='flex' flexDirection='column' gap={3} height='100%'>
      <Typography variant='h3'>{t('dashboard.Overview')}</Typography>
      <Scrollbar
        sx={{ height: '100%', width: '100%', paddingRight: '14px' }}
      >
        <Overview />
      </Scrollbar>
    </Box>
  )
}
