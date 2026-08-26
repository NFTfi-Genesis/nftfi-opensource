import { Box, useTheme, Link } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { FuseResultMatch } from 'fuse.js'
import { Iconify } from 'src/components/Iconify'
import { HighlightTypography } from './HighlightTypography'

interface SocialHandleProps {
  icon: string
  handle: string
  match?: FuseResultMatch
  url?: string
}

export function SocialHandle({ icon, handle, match, url }: SocialHandleProps) {
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

  const handleContent = (
    <HighlightTypography
      noWrap
      text={handle}
      highlights={match?.indices
        ? [...match.indices]
        : []}
    />
  )

  return (
    <Box
      key={icon}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        color: 'text.secondary',
      }}
    >
      <Box sx={circleContainerStyle}>
        <Iconify icon={icon} />
      </Box>
      {url
        ? (
          <Link
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                textDecoration: 'underline',
              },
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {handleContent}
          </Link>
        )
        : (
          handleContent
        )}
    </Box>
  )
}
