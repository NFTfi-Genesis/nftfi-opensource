import { memo } from 'react'
import { Stack, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolDisplayNames, ProtocolLogos } from 'src/utils/protocols'
import { useTableDensity } from 'src/components/Tables/useTableDensity'

export type LogoCellProps = { protocol: Protocol | null }

export const LogoCell = memo(function LogoCell({ protocol }: LogoCellProps) {
  const density = useTableDensity()

  if (protocol === null) return null

  const Logo = ProtocolLogos[protocol]
  const protocolName = ProtocolDisplayNames[protocol]

  return (
    <Tooltip
      title={protocolName}
      placement='top'
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [40, -40],
              },
            },
          ],
        },
      }}
    >
      <Stack
        height='100%'
        alignItems='center'
        justifyContent='center'
        color={theme => alpha(theme.palette.common.white, 0.83)}
      >
        <Logo
          width={density === 'compact'
            ? 16
            : 24}
          height={density === 'compact'
            ? 16
            : 24}
        />
      </Stack>
    </Tooltip>
  )
})
