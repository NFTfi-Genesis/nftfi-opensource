import { useMemo } from 'react'
import { Button, Stack, Tooltip, Typography, Box } from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TKey } from 'src/modules/translation/TKey'
import { Iconify } from 'src/components/Iconify'
import { useModals } from 'src/modules/modals/useModals'
import { Modals } from 'src/modules/modals/Modals'
import { useChecks } from '../checks/ChecksProvider'
import { TermsAndConditions } from './TermsAndConditions'

export type ModalActionsProps = {
  modal: Modals
  onAction?: () => void | Promise<void>
  actionLabel: TKey
  isDisabled?: boolean
  backLabel?: TKey
  backLink?: string
  actionTooltipText?: string
}

export function ModalActions({
  modal,
  onAction,
  actionLabel,
  isDisabled = false,
  backLabel,
  backLink,
  actionTooltipText,
}: ModalActionsProps) {
  const { t } = useTranslation()
  const { close } = useModals(modal)
  const checks = useChecks()

  const incompleteLabelsMemo = useMemo(
    () => checks.getIncompleteCheckLabels(),
    [checks]
  )
  const hasIncompleteChecks = incompleteLabelsMemo.length > 0

  const isButtonDisabled = isDisabled || !checks.areAllChecksPassed

  const showTooltip = hasIncompleteChecks

  const tooltipTitle = useMemo(
    () =>
      hasIncompleteChecks
        ? (
          <Box>
            <Typography variant='body2' sx={{ color: 'common.white', mb: 0.5 }}>
              {t('borrow.to-continue-you-need-to')}
            </Typography>
            {incompleteLabelsMemo.map((label: string, index: number) => (
              <Typography key={index} variant='body2' sx={{ color: 'common.white' }}>
                {` - ${label}`}
              </Typography>
            ))}
            {actionTooltipText && (
              <Typography variant='body2' sx={{ color: 'common.white', mt: 0.5 }}>
                {actionTooltipText}
              </Typography>
            )}
          </Box>
        )
        : null,
    [hasIncompleteChecks, incompleteLabelsMemo, actionTooltipText, t]
  )

  return (
    <Stack gap={2} mt={2}>
      <Box
        display='grid'
        gridTemplateColumns={backLabel
          ? '1fr 1fr'
          : '1fr'}
        gap={2}
        sx={{ width: '100%' }}
      >
        {backLabel && (
          <Button
            variant='outlined'
            component={backLink
              ? Link
              : 'button'}
            to={backLink}
            startIcon={<Iconify icon='ph:arrow-left' width={20} />}
            onClick={close}
            sx={{ flex: 1 }}
          >
            {t(backLabel)}
          </Button>
        )}
        <Tooltip
          title={tooltipTitle}
          placement='top'
          arrow
          disableHoverListener={!showTooltip}
        >
          <Box sx={{ flex: 1 }}>
            <Button
              variant='contained'
              color='primary'
              disabled={isButtonDisabled}
              onClick={onAction}
              sx={{ width: '100%' }}
              type='submit'
            >
              {t(actionLabel)}
            </Button>
          </Box>
        </Tooltip>
      </Box>
      <TermsAndConditions />
    </Stack>
  )
}
