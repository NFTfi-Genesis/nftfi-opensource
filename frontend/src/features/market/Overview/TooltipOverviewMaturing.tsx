import { Tooltip, Stack, Typography, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { formatAmount } from 'src/utils/amounts'
import { getTestId } from 'src/utils/testing'
import { Currency } from 'src/entities/domain/Currency'
import { LoansOverviewInfo } from './types'

interface TooltipOverviewMaturingProps {
  data?: LoansOverviewInfo | null
  children: React.ReactElement
}

export function TooltipOverviewMaturing({
  data,
  children,
}: TooltipOverviewMaturingProps) {
  const { t } = useTranslation()
  if (!data) {
    return children
  }

  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Stack spacing={1.5}>
        <Stack>
          <Typography variant='caption' color='text.secondary'>
            {t('dashboard.overview.cards.maturing.tooltip.title')}
          </Typography>
          <Typography variant='subtitle1' fontWeight='bold'>
            ${formatAmount(data.totalUsdValue, Currency.WETH)}
          </Typography>
        </Stack>

        <Stack direction='row' spacing={3}>
          <Stack flex={1}>
            <Typography variant='caption' color='text.secondary'>
              {t('dashboard.overview.cards.maturing.tooltip.eth')}
            </Typography>
            <Typography
              noWrap
              {...getTestId(
                'overviewPanel.maturing.total-eth',
                data.totalValueOfEthTokens
              )}
              variant='subtitle2'
              fontWeight='bold'
            >
              {formatAmount(
                data.totalValueOfEthTokens,
                Currency.WETH
              )}{' '}
              ETH
            </Typography>
            <Typography
              noWrap
              variant='caption'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {t('dashboard.overview.cards.maturing.tooltip.usdc')}
            </Typography>
            <Typography
              {...getTestId(
                'overviewPanel.maturing.total-usdc',
                data.totalValueOfUsdTokens
              )}
              variant='subtitle2'
              fontWeight='bold'
            >
              $
              {formatAmount(
                data.totalValueOfUsdTokens,
                Currency.USDC
              )}
            </Typography>
          </Stack>
          <Stack flex={1}>
            <Typography variant='caption' color='text.secondary'>
              {t('dashboard.overview.cards.maturing.tooltip.principal')}
            </Typography>
            <Typography
              noWrap
              {...getTestId(
                'overviewPanel.maturing.principal-eth',
                data.totalPrincipalOfEthLoans
              )}
              variant='subtitle2'
              fontWeight='bold'
            >
              {formatAmount(
                data.totalPrincipalOfEthLoans,
                Currency.WETH
              )}{' '}
              ETH
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
              {t('dashboard.overview.cards.maturing.tooltip.principal')}
            </Typography>
            <Typography
              {...getTestId(
                'overviewPanel.maturing.principal-usdc',
                data.totalPrincipalOfUsdLoans
              )}
              variant='subtitle2'
              fontWeight='bold'
            >
              $
              {formatAmount(
                data.totalPrincipalOfUsdLoans,
                Currency.USDC
              )}
            </Typography>
          </Stack>
          <Stack flex={1}>
            <Typography variant='caption' color='text.secondary'>
              {t('dashboard.overview.cards.maturing.tooltip.interest')}
            </Typography>
            <Typography
              noWrap
              {...getTestId(
                'overviewPanel.maturing.interest-eth',
                data.totalInterestOfEthLoans
              )}
              variant='subtitle2'
              fontWeight='bold'
            >
              {formatAmount(
                data.totalInterestOfEthLoans,
                Currency.WETH
              )}{' '}
              ETH
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
              {t('dashboard.overview.cards.maturing.tooltip.interest')}
            </Typography>
            <Typography
              {...getTestId(
                'overviewPanel.maturing.interest-usdc',
                data.totalInterestOfUsdLoans
              )}
              variant='subtitle2'
              fontWeight='bold'
            >
              $
              {formatAmount(
                data.totalInterestOfUsdLoans,
                Currency.USDC
              )}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  )

  return (
    <Tooltip
      title={tooltipContent}
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [-100, -30],
              },
            },
          ],
        },
        tooltip: {
          sx: {
            width: 'fit-content',
            maxWidth: '430px',
          },
        },
      }}
    >
      {children}
    </Tooltip>
  )
}
