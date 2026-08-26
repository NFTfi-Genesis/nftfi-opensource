import { memo, useRef } from 'react'
import { Box, Stack } from '@mui/material'
import { Address } from 'src/entities/base/Address'

import { CopyButton } from 'src/components/CopyButton'
import { useJazzIconAvatar } from 'src/hooks/useJazzIconAvatar'
import { useTableDensity } from 'src/components/Tables/useTableDensity'
import { UserAddressCell } from './UserAddressCell'

export type UserAddressLargeCellProps = {
  address: Address
}

export const UserAddressLargeCell = memo(function UserAddressLargeCell({
  address,
}: UserAddressLargeCellProps) {
  const iconRef = useRef<HTMLDivElement>(null)
  const density = useTableDensity()
  useJazzIconAvatar(iconRef, address, density === 'compact'
    ? 24
    : 32)

  return (
    <Stack
      direction='row'
      gap={3}
      height={density === 'compact'
        ? '35px'
        : '100%'}
      alignItems='center'
      justifyContent='flex-start'
    >
      <Box
        ref={iconRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <UserAddressCell address={address} />
      <CopyButton textToCopy={address} size={16} />
    </Stack>
  )
})
