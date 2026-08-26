import { Stack } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'

export function TooltipLtvChange() {
  const { t } = useTranslation()

  return <Stack spacing={2}>{t('dashboard.ltv-tooltip.description')}</Stack>
}
