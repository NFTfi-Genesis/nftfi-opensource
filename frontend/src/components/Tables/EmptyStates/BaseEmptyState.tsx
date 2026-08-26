import { Stack, Typography, Button } from '@mui/material'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useBreakpoints } from 'src/modules/theme/useBreakpoints'
import { Iconify } from 'src/components/Iconify'
import { TKey } from 'src/modules/translation/TKey'

interface BaseEmptyStateProps {
  title: string
  description: string
  ctaAction?: () => void
  ctaText?: TKey
  showClearFilters?: boolean
}

export function BaseEmptyState({
  title,
  description,
  ctaAction,
  ctaText = 'filters.clear',
  showClearFilters = true,
}: BaseEmptyStateProps) {
  const { t } = useTranslation()
  const { isMobileView } = useBreakpoints()

  const isClearFiltersCta = ctaText === 'filters.clear' || ctaText === 'filters.clear-filters'
  const shouldShowCta = ctaAction && !(isClearFiltersCta && !showClearFilters)

  return (
    <Stack alignItems='center' justifyContent='center' height='100%' px={2}>
      <Typography variant='h3'>{title}</Typography>
      <Typography variant='body1'>{description}</Typography>
      {shouldShowCta && (
        <Button
          variant='outlined'
          onClick={ctaAction}
          startIcon={isClearFiltersCta
            ? <Iconify icon='ph:trash' />
            : undefined}
          sx={{ mt: 2, maxWidth: 200, ...(isMobileView && { width: '90%' }) }}
        >
          {t(ctaText)}
        </Button>
      )}
    </Stack>
  )
}
