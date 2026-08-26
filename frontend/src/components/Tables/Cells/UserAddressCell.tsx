import { memo } from 'react'
import { Stack, Typography, Button } from '@mui/material'

import { Address } from 'src/entities/base/Address'

import { useEnsReverseLookup } from 'src/hooks/useEnsReverseLookup'
import { TooltipUser } from 'src/components/TooltipUser'

export type UserAddressCellProps = {
  // TODO: the component should respect the column align setting, not this prop
  align?: 'left' | 'right'
  onAddressClick?: (address: Address) => void
} & (
  {
    address: Address
    fallback?: never
  } | {
    address: Address | null
    fallback: string
  }
)

export const UserAddressCell = memo(function AddressCell({
  address,
  align = 'left',
  onAddressClick,
  fallback,
}: UserAddressCellProps) {
  const ens = useEnsReverseLookup(address)

  const handleClick = () => {
    if (address && onAddressClick) {
      onAddressClick(address)
    }
  }

  if (!address) {
    return (
      <Stack direction='row' gap={1} alignItems='center' height='100%' justifyContent={align === 'right'
        ? 'flex-end'
        : 'flex-start'}>
        <Typography variant='mono1' fontSize={14} noWrap>
          {fallback}
        </Typography>
      </Stack>
    )
  }

  const content = (
    <Typography
      variant='mono1'
      noWrap
      sx={{
        ...(onAddressClick && {
          transition: theme => theme.transitions.create(['color', 'opacity']),
          '&:hover': {
            color: 'text.primary',
            opacity: 0.8,
          },
          '&:active': {
            opacity: 0.6,
          },
        }),
      }}
    >
      {ens || address.slice(2, 8)}
    </Typography>
  )

  return (
    <Stack
      direction='row'
      gap={3}
      height='100%'
      alignItems='center'
      justifyContent={align === 'right'
        ? 'flex-end'
        : 'flex-start'}
    >
      <TooltipUser address={address}>
        {onAddressClick
          ? (
            <Button
              variant='text'
              onClick={handleClick}
              sx={{
                padding: 0,
                color: 'inherit',
                '&:hover': {
                  backgroundColor: 'transparent',
                },
              }}
            >
              {content}
            </Button>
          )
          : (
            content
          )}
      </TooltipUser>
    </Stack>
  )
})
