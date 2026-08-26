import { Box, Skeleton, Typography, Stack } from '@mui/material'
import { useMemo } from 'react'
import { Percentage } from 'src/entities/base/Percentage'
import { formatPercentage } from 'src/utils/numbers'
import { getTestId } from 'src/utils/testing'
import { RetryPanel } from './RetryPanel'

export type BarChartPercentageProps = {
  data: {
    label: string
    percentage: Percentage
  }[]
  loading?: boolean
  error?: boolean
}

export function BarChartPercentage({
  data,
  loading,
  error,
}: BarChartPercentageProps) {
  const dataLimited = useMemo(() => data.slice(0, 100), [data])

  const dataToShow = useMemo(() => {
    let data = dataLimited
    if (loading) {
      data = Array.from({ length: 10 }).map(() => ({
        label: '',
        percentage: 0 as Percentage,
      }))
    }
    if (error) {
      data = []
    }
    return data
  }, [dataLimited, loading, error])

  if (error) {
    return <RetryPanel height={46} />
  }

  return (
    <Stack direction='column' spacing={2.5} width='100%'>
      {dataToShow.map((item, index) => (
        <Stack key={`percentage-bar-${index}`} width='100%'>
          <Stack
            direction='row'
            justifyContent='space-between'
            mb={0.5}
            width='100%'
            spacing={1}
          >
            {loading && (
              <Skeleton
                variant='text'
                width='100%'
                sx={{ borderRadius: '4px' }}
              />
            )}
            {!loading && (
              <Typography
                {...getTestId('overviewPanel.topCollection.name')}
                variant='caption2'
                noWrap
                sx={{
                  maxWidth: '70%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </Typography>
            )}
            {!loading && (
              <Typography variant='subtitle1'>
                {formatPercentage(item.percentage)}%
              </Typography>
            )}
          </Stack>
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              height: '1px',
              bgcolor: 'grey.700',
              borderRadius: 1,
            }}
          >
            <Box
              sx={{
                width: `${item.percentage}%`,
                minWidth: loading
                  ? 0
                  : 5,
                height: '100%',
                bgcolor: 'common.white',
                borderRadius: '4px 0 0 4px',
              }}
            />
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
