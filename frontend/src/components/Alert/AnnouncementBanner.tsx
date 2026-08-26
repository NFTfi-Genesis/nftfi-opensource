import { Alert, Link } from '@mui/material'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { AlertSeverity } from './types'

const ANNOUNCEMENT_BLOG_URL = 'https://nftfi.com/blog/sunsetting-nftfi'

export function AnnouncementBanner() {
  const { t } = useTranslation()
  const { isMobileView } = useBreakpoints()

  return (
    <Alert
      severity={AlertSeverity.Warning}
      variant='outlined'
      sx={{
        marginTop: isMobileView
          ? '8px'
          : '12px',
        marginBottom: isMobileView
          ? '12px'
          : '0',
        marginRight: isMobileView
          ? '16px'
          : '24px',
        marginLeft: isMobileView
          ? '16px'
          : '24px',
        padding: '0 10px',
      }}
    >
      {t('warning-messages.sunset-announcement')}
      {' '}
      <Link
        href={ANNOUNCEMENT_BLOG_URL}
        target='_blank'
        rel='noopener noreferrer'
        sx={{ fontWeight: 600 }}
      >
        {t('warning-messages.sunset-announcement-link')}
      </Link>
    </Alert>
  )
}
