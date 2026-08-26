import { Stack } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'

// TODO: Tooltips improve naming and file structure

export function TooltipAprVsEapr() {
  const { t } = useTranslation()

  const aprLabel = t('borrow.loan-summary.apr')
  const eaprLabel = t('borrow.loan-summary.eapr')

  return (
    <Stack spacing={2}>
      <div>
        <strong>{aprLabel}</strong>{' '}
        {t('dashboard.apr-tooltip.apr-vs-eapr')}
      </div>
      <div>
        <strong>{aprLabel}</strong> ({t('dashboard.apr-tooltip.apr-full')}) <br />
        {t('dashboard.apr-tooltip.apr-description')}
      </div>
      <div>
        <strong>{eaprLabel}</strong> ({t('dashboard.apr-tooltip.eapr-full')}) <br />
        {t('dashboard.apr-tooltip.eapr-description')}
      </div>
    </Stack>
  )
}
