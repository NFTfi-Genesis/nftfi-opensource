import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Button, Stack, Typography } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'

import { useTranslation } from 'src/modules/translation/useTranslation'

export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [navigate])

  return (
    <>
      <Helmet>
        <title>{t('page-titles.not-found')}</title>
      </Helmet>
      <Stack gap='60px' width='100%'>
        <Stack gap={1} alignItems='center' justifyContent='center' height='100%'>
          <Typography variant='h1' color='text.secondary'>{t('page-titles.not-found')}</Typography>
          <Typography variant='body1'>{t('not-found-page.redirecting')}</Typography>
          <Button component={Link} to='/' color='inherit' sx={{ mt: 3 }}>
            {t('not-found-page.go-home')}
          </Button>
        </Stack>
      </Stack>
    </>
  )
}
