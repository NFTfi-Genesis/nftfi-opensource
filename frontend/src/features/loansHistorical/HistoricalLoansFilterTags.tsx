import { memo, useCallback } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { LoanStatus } from 'src/entities/domain/Loan'
import { LoanStatusDisplayKeys } from 'src/utils/loans'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { getTestId } from 'src/utils/testing'
import { HistoricalLoansFilters, UpdateHistoricalLoansFilter } from './useHistoricalLoansTableState'

type HistoricalLoansFiltersStatus = {
  hasActiveFilters: boolean
  hasStatuses: boolean
}

export type HistoricalLoansFilterTagsProps = {
  filters: HistoricalLoansFilters
  updateFilter: UpdateHistoricalLoansFilter
  filterStatus: HistoricalLoansFiltersStatus
}

export const HistoricalLoansFilterTags = memo(function HistoricalLoansFilterTags({ filters, updateFilter, filterStatus }: HistoricalLoansFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveStatus = useCallback((status: LoanStatus) => {
    const next = filters.statuses.filter(s => s !== status)
    updateFilter('statuses', next)
  }, [filters.statuses, updateFilter])

  if (!filterStatus.hasStatuses) return null

  return (
    <TagsGroup label={`${t('filters.status')}:`} {...getTestId('table.toolbar.status')}>
      {filters.statuses.map(status => (
        <FilterTag
          key={status}
          label={t(LoanStatusDisplayKeys[status])}
          onDelete={() => handleRemoveStatus(status)}
        />
      ))}
    </TagsGroup>
  )
})
