import { Typography, Stack } from '@mui/material'
import { useFxRate } from 'src/services/hooks/ethereum/useFxRate'
import { useGasPrice } from 'src/services/hooks/ethereum/useGasPrice'
import { Iconify } from 'src/components/Iconify'
import { WalletButton } from './WalletButton'

export type WalletWidgetProps = {
  minimise?: boolean
  showGasPrice?: boolean
  showEthPrice?: boolean
}

export function WalletWidget({
  minimise = false,
  showGasPrice = true,
  showEthPrice = true,
}: WalletWidgetProps = {}) {
  const { data: ethPrice } = useFxRate()
  const { data: gasPrice } = useGasPrice()

  return (
    <Stack
      gap={1}
      height='100%'
      justifyContent='center'
      id='wallet-widget'
      className={minimise
        ? 'minimised'
        : ''}
    >
      <WalletButton minimise={minimise} />
      <Stack
        direction={minimise
          ? 'column'
          : 'row'}
        gap={1}
        justifyContent='center'
        alignItems={minimise
          ? 'center'
          : 'flex-start'}
      >
        {showEthPrice && (
          <Stack direction='row' alignItems='center' gap={0.25}>
            <Iconify icon='ph:currency-eth-fill' width={12} color='text.secondary' />
            <Typography variant='caption'>${ethPrice
              ? formatRate(ethPrice)
              : '-----'}</Typography>
          </Stack>
        )}
        {showGasPrice && (
          <Stack direction='row' alignItems='center' gap={0.25}>
            <Iconify icon='ph:gas-pump-fill' width={12} color='text.secondary' />
            <Typography variant='caption'>{gasPrice?.toFixed(2) ?? '-----'}</Typography>
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}

// Format the ETH price to include commas and no decimal points
function formatRate(rate: number) {
  return rate
    .toFixed(0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
