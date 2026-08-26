import { alpha, Box, useTheme } from '@mui/material'
import { FuseResultMatch } from 'fuse.js'
import { JazzIconAvatar } from 'src/components/JazzIconAvatar'
import { Address } from 'src/entities/base/Address'
import { CopyButton } from 'src/components/CopyButton'
import { HighlightTypography } from './HighlightTypography'

interface WalletAddressProps {
  address: {
    value: Address
    ens?: string
  }
  match?: FuseResultMatch
}

export function WalletAddress({ address, match }: WalletAddressProps) {
  const theme = useTheme()

  const circleContainerStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `1px solid ${alpha(theme.palette.common.white, 0.56)}`,
    color: alpha(theme.palette.common.white, 0.56),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.palette.customPallette.nftfi.paper,
    flexShrink: 0,
  }

  const displayText = address.ens || address.value

  return (
    <Box
      color='text.secondary'
      key={address.value}
      display='flex'
      alignItems='center'
      gap={1}
    >
      <Box sx={circleContainerStyle} mr={2.5}>
        <JazzIconAvatar address={address.value} diameter={24} noBorder />
      </Box>
      <HighlightTypography
        text={displayText}
        highlights={match?.indices
          ? [...match.indices]
          : []}
        noWrap
      />
      <CopyButton textToCopy={address.value} size={21} />
    </Box>
  )
}
