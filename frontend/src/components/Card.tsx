import { ReactNode } from 'react'
import {
  Card as MuiCard,
  CardContent,
  Typography,
  Stack,
  useTheme,
  SxProps,
  Theme,
} from '@mui/material'

export type CardProps = {
  title?: string | ReactNode
  subtitle?: string | ReactNode
  children?: ReactNode
  justifyContent?: string
  titleDottedLine?: boolean
  sx?: SxProps<Theme>
  headerAdditionalContent?: ReactNode
}

export function Card({
  title,
  subtitle,
  justifyContent,
  children,
  titleDottedLine = false,
  sx,
  headerAdditionalContent,
}: CardProps) {
  const theme = useTheme()

  return (
    <MuiCard
      sx={{
        padding: 0,
        ...sx,
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent,
        }}
      >
        {title && (
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            {...(titleDottedLine && {
              borderBottom: `1px dashed ${theme.palette.divider}`,
            })}
            paddingBottom={2}
          >
            {
              typeof title === 'string'
                ? <Typography variant='h4'>{title}</Typography>
                : title
            }
            {headerAdditionalContent}
          </Stack>
        )}
        {subtitle && typeof subtitle === 'string'
          ? <Typography variant='caption'>{subtitle}</Typography>
          : subtitle
        }
        {children}
      </CardContent>
    </MuiCard>
  )
}
