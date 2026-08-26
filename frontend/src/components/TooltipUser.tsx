import { Box, Stack, Tooltip, Typography, Skeleton } from '@mui/material'
import { useState } from 'react'
import { useWalletLoansStats } from 'src/services/hooks/overview/useWalletLoansStats'
import { Address } from 'src/entities/base/Address'
import { Amount } from 'src/entities/base/Amount'
import { generateJazzIconAvatar } from 'src/hooks/useJazzIconAvatar'
import { shortenAddressMiddle } from 'src/utils/strings'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatAmount } from 'src/utils/amounts'
import { Currency } from 'src/entities/domain/Currency'
import { useEnsReverseLookup } from 'src/hooks/useEnsReverseLookup'
import { CopyButton } from 'src/components/CopyButton'

export type TooltipUserProps = {
  address: Address
  children: React.ReactElement
}

export function TooltipUser({ children, address }: TooltipUserProps) {
  const { t } = useTranslation()
  const jazzIcon = generateJazzIconAvatar(address, 48)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  const ens = useEnsReverseLookup(address)

  const { data: stats, isLoading } = useWalletLoansStats({
    wallet: address,
    shouldExecute: isTooltipOpen,
  })

  const handleTooltipOpen = () => {
    setIsTooltipOpen(true)
  }

  const handleTooltipClose = () => {
    setIsTooltipOpen(false)
  }

  return (
    <Tooltip
      placement='left'
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
            width: '310px',
            maxWidth: '430px',
          },
        },
      }}
      disableFocusListener
      title={
        <Stack direction='column' gap={2} p={1}>
          <Stack direction='row' gap={2} height='100%' alignItems='center' justifyContent='flex-start'>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                ref={ref => {
                  if (ref) {
                    ref.innerHTML = ''
                    ref.appendChild(jazzIcon)
                  }
                }}
              ></div>
            </Box>
            <Stack direction='row' gap={3}>
              <Stack direction='column' gap={0.5} justifyContent='center'>
                <Typography variant='h6' sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {ens
                    ? ens
                    : `${shortenAddressMiddle(address)}`}
                </Typography>
                {ens && (
                  <Typography variant='subtitle1' color='text.secondary'>
                    {shortenAddressMiddle(address)}
                  </Typography>
                )}
              </Stack>
              <CopyButton textToCopy={address} size={24} />
            </Stack>
          </Stack>
          <Stack direction='row' gap={8} justifyContent='space-between'>
            <Stack direction='column' gap={0.5}>
              <Typography variant='mono4'>
                {isLoading
                  ? <Skeleton width={40} height={20} />
                  : stats?.borrowerLoansCount}
              </Typography>
              <Typography variant='mono4'>
                {isLoading
                  ? (
                    <Skeleton width={80} height={20} />
                  )
                  : (
                    `$${formatAmount(stats?.borrowerTotalAmountUsd || (0 as Amount), Currency.USDC)}`
                  )}
              </Typography>
              <Typography variant='mono2' fontWeight={400} sx={{ color: theme => theme.palette.text.secondary }}>
                {t('dashboard.user-tooltip.borrowed')}
              </Typography>
            </Stack>
            <Stack direction='column' gap={0.5}>
              <Typography variant='mono4'>
                {isLoading
                  ? <Skeleton width={40} height={20} />
                  : stats?.lenderLoansCount}
              </Typography>
              <Typography variant='mono4'>
                {isLoading
                  ? (
                    <Skeleton width={80} height={20} />
                  )
                  : (
                    `$${formatAmount(stats?.lenderTotalAmountUsd || (0 as Amount), Currency.USDC)}`
                  )}
              </Typography>
              <Typography variant='mono2' fontWeight={400} sx={{ color: theme => theme.palette.text.secondary }}>
                {t('dashboard.user-tooltip.loaned')}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      }
      onOpen={handleTooltipOpen}
      onClose={handleTooltipClose}
    >
      {children}
    </Tooltip>
  )
}
