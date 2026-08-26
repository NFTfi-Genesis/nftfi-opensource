import { memo } from 'react'
import { Stack } from '@mui/material'
import { LoanStatusSelect } from 'src/components/Select/LoanStatusSelect'
import { getTestId } from 'src/utils/testing'
import { HistoricalLoansFilters, HISTORICAL_LOAN_STATUSES, UpdateHistoricalLoansFilter } from './useHistoricalLoansTableState'

export type HistoricalLoansFiltersFormProps = {
  filters: HistoricalLoansFilters
  updateFilter: UpdateHistoricalLoansFilter
}

export const HistoricalLoansFiltersForm = memo(function HistoricalLoansFiltersForm({ filters, updateFilter }: HistoricalLoansFiltersFormProps) {
  return (
    <Stack gap={2}>
      <LoanStatusSelect
        statuses={filters.statuses}
        options={HISTORICAL_LOAN_STATUSES}
        onChange={values => updateFilter('statuses', values.statuses)}
        {...getTestId('dashboard.filters.status')}
      />
    </Stack>
  )
})
