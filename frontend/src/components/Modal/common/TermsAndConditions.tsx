import { Link, Typography } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { config } from 'src/config/config'

const termsOfServiceUrl = config.urls.termsOfService
const termsOfUseUrl = config.urls.termsOfUse

export function TermsAndConditions() {
  const { t } = useTranslation()

  return (
    <Typography variant='caption' sx={{ fontFamily: 'fontFamily' }} textAlign='center' color='common.white'>
      {t('borrow.by-signing-this-transaction-you-agree-to-our')}{' '}
      <Link
        href={termsOfServiceUrl}
        target='_blank'
        rel='noopener noreferrer'
        color='primary'
      >
        {t('borrow.terms-of-service')}
      </Link>{' '}
      {t('borrow.and')}{' '}
      <Link
        href={termsOfUseUrl}
        target='_blank'
        rel='noopener noreferrer'
        color='primary'
      >
        {t('borrow.terms-of-use')}
      </Link>
      .
    </Typography>
  )
}
