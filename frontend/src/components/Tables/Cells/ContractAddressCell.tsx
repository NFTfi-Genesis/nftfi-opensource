import { Stack, Typography } from '@mui/material'
import { memo } from 'react'
import { Address } from 'src/entities/base/Address'
import { CopyButton } from 'src/components/CopyButton'

export type ContractAddressCellProps = {
  align?: 'left' | 'right' | 'center'
} & (
  {
    address: Address
    fallback?: never
  } | {
    address: Address | null
    fallback: string
  }
)

export const ContractAddressCell = memo(function ContractAddressCell({
  address,
  align = 'left',
  fallback,
}: ContractAddressCellProps) {
  return (
    <Stack
      direction='row'
      gap={1}
      height='100%'
      alignItems='center'
      justifyContent={align === 'right'
        ? 'flex-end'
        : align === 'center'
          ? 'center'
          : 'flex-start'}
    >
      <Typography
        variant='mono1'
        noWrap
      >
        {address || fallback}
      </Typography>
      {address
        ? <CopyButton textToCopy={address} size={16}/>
        : null}
    </Stack>
  )
})
