import { Box, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { JazzIconAvatar } from 'src/components/JazzIconAvatar'
import GreyJazzIcon from 'src/assets/images/svg/grey-jazz-icon.svg'
import { Iconify } from 'src/components/Iconify'
import { Address } from 'src/entities/base/Address'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'

interface ContactAvatarProps {
  address?: string
  diameter?: number
  isFavourite?: boolean
  onFavouriteClick?: () => void
  index?: number
}

export function ContactAvatar({
  address,
  diameter = 56,
  isFavourite = false,
  onFavouriteClick,
  index,
}: ContactAvatarProps) {
  const theme = useTheme()
  const { t } = useTranslation()

  return (
    <Box
      sx={{ position: 'relative' }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {address
        ? (
          <Box sx={{ '&:hover .star-icon': { opacity: 1 } }}>
            <JazzIconAvatar
              address={address as Address}
              diameter={diameter}
              noBorder
            />
            <Tooltip
              title={t(`contacts.${isFavourite
                ? 'unfavourite'
                : 'favourite'}`)}
            >
              <Iconify
                icon='ph:star-fill'
                className='star-icon'
                onClick={onFavouriteClick}
                {...getTestId(
                  `contacts.contact.${index
                    ? index + '.'
                    : ''}favourite.${isFavourite
                    ? 'visible'
                    : 'hidden'}`
                )}
                sx={{
                  position: 'absolute',
                  top: -3,
                  right: -6,
                  width: 24,
                  height: 24,
                  color: theme.palette.warning.main,
                  opacity: isFavourite
                    ? 1
                    : 0,
                  transition: 'opacity 0.2s',
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          </Box>
        )
        : (
          <Box sx={{ width: diameter, height: diameter }}>
            <GreyJazzIcon width='100%' height='100%' />
          </Box>
        )}
    </Box>
  )
}
