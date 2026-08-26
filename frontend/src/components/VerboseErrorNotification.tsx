import { Link, Stack, Typography } from '@mui/material'
import { CopyButton } from 'src/components/CopyButton'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { jsonStringify } from 'src/utils/json'

export type VerboseErrorNotificationProps = {
  title: string
  details: Record<string, unknown>
  subtitle?: string
}

export function VerboseErrorNotification({ title, subtitle, details }: VerboseErrorNotificationProps) {
  const { t } = useTranslation()
  return (
    <Stack>
      <Stack direction='row' alignItems='center' spacing={1}>
        <Typography style={{ fontWeight: 'bold' }}>{title}</Typography>
        <CopyButton textToCopy={jsonStringify(details, 2)} />
      </Stack>
      {!subtitle && <Typography variant='body2'>{t('error-messages.verbose-error-notification.description')} <Link href='https://discord.com/channels/677285101998178387/1104084937776300174' target='_blank'>{t('error-messages.verbose-error-notification.discord-link')}</Link>.</Typography> }
      {subtitle && <Typography variant='body2'>{subtitle}</Typography>}
    </Stack>
  )
}
