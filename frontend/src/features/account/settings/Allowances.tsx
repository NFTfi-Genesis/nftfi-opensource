import { Stack, Typography } from '@mui/material'

import { useTranslation } from 'src/modules/translation/useTranslation'
import { Panel } from 'src/components/Panel'
import { TableCurrentAllowances } from './TableCurrentAllowances'
import { TablePreviousAllowances } from './TablePreviousAllowances'

export function Allowances() {
  const { t } = useTranslation()

  return (
    <Panel fullWidth>
      <Stack gap={3} width='100%'>
        <Typography variant='h4'>
          {t('user-details-page.manage-allowances')}
        </Typography>
        <TableCurrentAllowances />
        <TablePreviousAllowances />
      </Stack>
    </Panel>
  )
}
