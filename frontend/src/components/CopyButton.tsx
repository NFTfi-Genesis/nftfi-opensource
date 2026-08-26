import { IconButton } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { notify, NotificationType } from 'src/modules/notifications/notify'
import { useTranslation } from 'src/modules/translation/useTranslation'

type CopyButtonProps = {
  textToCopy: string
  size?: number
}

export function CopyButton({ textToCopy, size = 21 }: CopyButtonProps) {
  const { t } = useTranslation()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      notify({
        message: t('info-messages.copied'),
        variant: NotificationType.Info,
      })
    } catch (error) {
      console.error(error)
      notify({
        message: t('warning-messages.not-copied'),
        variant: NotificationType.Warning,
      })
    }
  }

  return (
    <IconButton aria-label='copy-text' onClick={handleCopy}>
      <Iconify icon='ph:copy-simple' width={size} />
    </IconButton>
  )
}
