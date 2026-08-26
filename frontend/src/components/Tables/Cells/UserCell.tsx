import { memo, useRef } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { Address } from 'src/entities/base/Address'

import { CopyButton } from 'src/components/CopyButton'
import { useEnsReverseLookup } from 'src/hooks/useEnsReverseLookup'
import { useJazzIconAvatar } from 'src/hooks/useJazzIconAvatar'

export type UserCellProps = {
  address: Address
}

export const UserCell = memo(function UserCell({ address }: UserCellProps) {
  const ens = useEnsReverseLookup(address)

  const iconRef = useRef<HTMLDivElement>(null)
  useJazzIconAvatar(iconRef, address, 32)

  return (
    <Stack
      direction='row'
      gap={3}
      height='100%'
      alignItems='center'
      justifyContent='flex-end'
    >
      <Box
        ref={iconRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <Typography variant='mono1'>{ens || address}</Typography>
      <CopyButton textToCopy={address} size={16} />
    </Stack>
  )
})
