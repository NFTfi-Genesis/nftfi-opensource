import { Stack, Box, Typography, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { getTestId } from 'src/utils/testing'
import { formatDateByChartModeLong, formatDateByChartModeShort } from '../utils'
import { ColumnChartDateProps } from './LoansDueChart'
import { getTimerangeLabels } from './getTimerangeLabels'
import { TooltipLoansDue } from './TooltipLoansDue'

export function Chart({
  data,
  chartMode,
}: Pick<ColumnChartDateProps, 'data' | 'chartMode'>) {
  const [overviewExpanded] = useLocalStorage(
    LocalStorageKeys.DashboardUserPreferences.OverviewExpanded
  )

  const timerangeLabels = getTimerangeLabels(
    overviewExpanded
      ? 320
      : 170,
    data.map(item => item.date),
    formatDateByChartModeShort(new Date(data[0].date), chartMode).length
  )

  return (
    <Stack direction='column' spacing={1}>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          height: 110,
          justifyContent: 'space-between',
        }}
      >
        {data.map((item, index) => {
          // Find the maximum value to calculate relative heights
          const maxValue = Math.max(...data.map(d => d.loanCount))
          const barHeight = (item.loanCount / maxValue) * 110 // 150px as max height

          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                position: 'relative',
                height: '100%',
              }}
            >
              <Tooltip
                // open={true}
                title={
                  <TooltipLoansDue
                    formattedDate={formatDateByChartModeLong(
                      new Date(item.date),
                      chartMode
                    )}
                    loanCount={item.loanCount}
                    totalUsdValue={item.totalUsdValue}
                    index={index}
                  />
                }
                placement='left-start'
                slotProps={{
                  popper: {
                    modifiers: [
                      {
                        name: 'preventOverflow',
                        options: {
                          altBoundary: true,
                          tether: false,
                        },
                      },
                    ],
                  },
                  tooltip: {
                    sx: {
                      bgcolor: theme => theme.palette.background.paperOffset,
                      '& .MuiTooltip-arrow': {
                        color: theme => theme.palette.background.paperOffset,
                      },
                      paddingY: 1,
                      paddingX: 2,
                      fontSize: '0.75rem',
                    },
                  },
                }}
              >
                <Box
                  {...getTestId(`overview.maturing.chart.bar.${index}`)}
                  sx={{
                    width: overviewExpanded
                      ? '8px'
                      : '4px',
                    maxHeight: '90px',
                    minHeight: '10px',
                    height: `${barHeight}px`,
                    backgroundColor: theme =>
                      alpha(theme.palette.common.white, 0.72),
                    borderRadius: '4px 4px 0px 0px',
                    mb: 1,
                    '&:hover': {
                      backgroundColor: theme => theme.palette.common.white,
                    },
                  }}
                />
              </Tooltip>
            </Box>
          )
        })}
      </Box>
      <Box
        sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}
      >
        {timerangeLabels.map((label, index) => (
          <Typography
            variant='caption'
            key={index}
            {...getTestId(`overview.maturing.chart.date.${index}`)}
          >
            {formatDateByChartModeShort(new Date(label), chartMode)}
          </Typography>
        ))}
      </Box>
    </Stack>
  )
}
