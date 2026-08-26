import {
  Card,
  Typography,
  Stack,
  Skeleton,
  SxProps,
  Theme,
} from '@mui/material'
import { forwardRef, HTMLAttributes } from 'react'
import { getTestId, getRawValues } from 'src/utils/testing'
import { RetryPanel } from './RetryPanel'

export type DataCardProps = {
  cardTitle: string
  value: string
  subtext: string
  showSubtext?: boolean
  loading?: boolean
  error?: boolean
  dataRawValue?: Record<string, string | number | undefined>
  sx?: SxProps<Theme>
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>

export const DataCard = forwardRef<HTMLDivElement, DataCardProps>(
  function DataCard(
    {
      cardTitle,
      value,
      subtext,
      loading,
      error,
      showSubtext = true,
      dataRawValue,
      sx,
      ...props
    },
    ref
  ) {
    return (
      <Card
        ref={ref}
        {...props}
        {...getTestId(`overviewPanel.${cardTitle?.toLowerCase()}`)}
        sx={{
          padding: 2,
          width: '100%',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          backgroundColor: theme =>
            theme.palette.customPallette.nftfi.pageBackground,
          borderRadius: 2.5,
          ...sx,
        }}
      >
        <Stack direction='column' justifyContent='space-between' spacing={0.1}>
          <Typography variant='subtitle2'>{cardTitle}</Typography>
          {error && <RetryPanel />}
          {!error && (
            <>
              <Typography
                variant='h4'
                noWrap
                textOverflow='ellipsis'
                {...getTestId(
                  `overview.${cardTitle?.toLowerCase() || 'unknown'}`
                )}
                {...getRawValues(dataRawValue)}
              >
                {loading
                  ? (
                    <Skeleton
                      variant='text'
                      width='75%'
                      sx={{ borderRadius: '4px' }}
                    />
                  )
                  : (
                    value
                  )}
              </Typography>
              {showSubtext && (
                <Typography
                  variant='caption'
                  noWrap
                  textOverflow='ellipsis'
                  mt={1}
                >
                  {loading
                    ? (
                      <Skeleton variant='text' sx={{ borderRadius: '4px' }} />
                    )
                    : (
                      subtext
                    )}
                </Typography>
              )}
            </>
          )}
        </Stack>
      </Card>
    )
  }
)
