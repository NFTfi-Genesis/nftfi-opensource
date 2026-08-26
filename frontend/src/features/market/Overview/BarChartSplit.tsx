import React from 'react'
import { Box, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { formatAmountCompact } from 'src/utils/amounts'
import { formatPercentage } from 'src/utils/numbers'
import { getTestId } from 'src/utils/testing'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { RetryPanel } from './RetryPanel'

export type BarChartSplitProps = {
  data: {
    label: string
    value: Amount
    color: string
  }[]
  showLegend?: boolean
  loading?: boolean
  error?: boolean
  type: 'currency' | 'protocol'
}

export function BarChartSplit({
  data,
  showLegend = true,
  loading,
  error,
  type,
}: BarChartSplitProps) {
  if (error) {
    return <RetryPanel height={46} />
  }
  // Calculate total value for percentage calculations
  const totalValue = data.reduce((sum, item) => sum + item.value, 0) as Amount
  const dataFiltered = data.filter(item => item.value > 0)

  return (
    <Stack direction='column' spacing={2}>
      <TooltipBarChartSplit data={dataFiltered} totalValue={totalValue}>
        {/* Bar chart with sections */}
        {loading
          ? ( <BarChartSplitSkeleton /> )
          : ( <Box
            sx={{
              display: 'flex',
              width: '100%',
              height: 8,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {dataFiltered.map(item => (
              <Box
                key={`bar-${item.label}`}
                sx={{
                  width: `${(item.value / totalValue) * 100}%`,
                  height: '100%',
                  backgroundColor: item.color,
                  minWidth: '10px', // Adding minimal width to ensure visibility of small values
                }}
              />
            ))}
          </Box>
          )}
      </TooltipBarChartSplit>

      {/* Legend */}
      {showLegend
        && (loading
          ? (
            <LegendSkeleton />
          )
          : (
            <Stack
              direction='row'
              spacing={4}
              flexWrap='wrap'
              justifyContent='center'
              rowGap={1}
            >
              {dataFiltered.map(item => (
                <Stack
                  direction='row'
                  alignItems='center'
                  spacing={1}
                  key={`legend-${item.label}`}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: item.color,
                    }}
                  />
                  <Typography {...getTestId(`overview.${type}.${item.label}`)} fontWeight={500} fontSize={13}>
                    {item.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ))}
    </Stack>
  )
}

type TooltipBarChartSplitProps = Omit<BarChartSplitProps,'type'> & {
  totalValue: Amount
  children: React.ReactElement
}

const TooltipBarChartSplit = React.forwardRef<
  HTMLDivElement,
  TooltipBarChartSplitProps
>(function TooltipBarChartSplit({ data, totalValue, children }, ref) {
  return (
    <Tooltip
      title={
        <Stack direction='column' spacing={2.75}>
          {data.map(item => (
            <Stack
              direction='row'
              spacing={5}
              key={`tooltip-${item.label}`}
              justifyContent='space-between'
              alignItems='center'
            >
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: item.color,
                  }}
                />
                <Typography variant='chartLabel'>{item.label}</Typography>
              </Stack>
              <Stack direction='row' spacing={1}>
                <Typography variant='mono2' textAlign='right'>
                  ${formatAmountCompact(item.value)}
                </Typography>
                <Typography variant='mono2' fontWeight={700}>
                  {formatPercentage((item.value / totalValue) * 100 as Percentage)}%
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      }
    >
      <Box ref={ref}>{children}</Box>
    </Tooltip>
  )
})

const BarChartSplitSkeleton = React.forwardRef<HTMLDivElement>(
  function BarChartSplitSkeleton(props, ref) {
    return (
      <Box ref={ref}>
        <Skeleton
          variant='rectangular'
          sx={{ minHeight: 8, borderRadius: '100px' }}
          width='100%'
        />
      </Box>
    )
  }
)

function LegendSkeleton({ length = 3 }: { length?: number }) {
  return (
    <Stack direction='row' spacing={3} flexWrap='wrap' justifyContent='center'>
      {Array.from({ length }).map((_, index) => (
        <Skeleton
          key={index}
          variant='rectangular'
          sx={{ borderRadius: '8px' }}
          height={22}
          width={57}
        />
      ))}
    </Stack>
  )
}
