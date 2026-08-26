import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { formatAmount } from 'src/utils/amounts'
import { Amount } from 'src/entities/base/Amount'
import { Currency } from 'src/entities/domain/Currency'
import { CollectionsFilters, CollectionsFiltersStatus, UpdateCollectionsFilter } from './useCollectionsTableState'

type CollectionsFilterTagsProps = {
  filters: CollectionsFilters
  updateFilter: UpdateCollectionsFilter
  filterStatus: CollectionsFiltersStatus
}

export const CollectionsFilterTags = memo(function CollectionsFilterTags({
  filters,
  updateFilter,
  filterStatus,
}: CollectionsFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveCollection = useCallback((collectionToRemove: string) => {
    const updatedCollections = filters.collections.filter(c => c.id !== collectionToRemove)
    updateFilter('collections', updatedCollections)
  }, [filters.collections, updateFilter])

  const hasTotalLoanAmount = filters.totalLoanAmount.min !== null
    || filters.totalLoanAmount.max !== null
  const hasAvgLoanAmount = filters.avgLoanAmount.min !== null
    || filters.avgLoanAmount.max !== null

  const handleRemoveTotalLoanAmount = useCallback(() => {
    updateFilter('totalLoanAmount', { min: null, max: null })
  }, [updateFilter])

  const handleRemoveAvgLoanAmount = useCallback(() => {
    updateFilter('avgLoanAmount', { min: null, max: null })
  }, [updateFilter])

  const totalLoanAmountLabel = useMemo(() => {
    const { min, max } = filters.totalLoanAmount

    if (min === null && max === null) return ''
    if (min !== null && max !== null) {
      const minFormatted = formatAmount(min as Amount, Currency.USD, { compactThreshold: 5 })
      const maxFormatted = formatAmount(max as Amount, Currency.USD, { compactThreshold: 5 })
      return `$${minFormatted} - $${maxFormatted}`
    }
    if (min !== null) {
      const minFormatted = formatAmount(min as Amount, Currency.USD, { compactThreshold: 5 })
      return `≥$${minFormatted}`
    }
    const maxFormatted = formatAmount(max as Amount, Currency.USD, { compactThreshold: 5 })
    return `≤$${maxFormatted}`
  }, [filters.totalLoanAmount])

  const avgLoanAmountLabel = useMemo(() => {
    const { min, max } = filters.avgLoanAmount

    if (min === null && max === null) return ''
    if (min !== null && max !== null) {
      const minFormatted = formatAmount(min as Amount, Currency.USD, { compactThreshold: 5 })
      const maxFormatted = formatAmount(max as Amount, Currency.USD, { compactThreshold: 5 })
      return `$${minFormatted} - $${maxFormatted}`
    }
    if (min !== null) {
      const minFormatted = formatAmount(min as Amount, Currency.USD, { compactThreshold: 5 })
      return `≥$${minFormatted}`
    }
    const maxFormatted = formatAmount(max as Amount, Currency.USD, { compactThreshold: 5 })
    return `≤$${maxFormatted}`
  }, [filters.avgLoanAmount])

  return (
    <>
      {filterStatus.hasCollection && (
        <TagsGroup label={`${t('filters.collection')}:`} noWrap>
          {filters.collections.map(collection => (
            <FilterTag
              key={collection.id}
              label={collection.info.name}
              onDelete={() => handleRemoveCollection(collection.id)}
            />
          ))}
        </TagsGroup>
      )}

      {hasTotalLoanAmount && (
        <TagsGroup label={`${t('custom-table-columns.volume')}:`} noWrap>
          <FilterTag label={totalLoanAmountLabel} onDelete={handleRemoveTotalLoanAmount} />
        </TagsGroup>
      )}

      {hasAvgLoanAmount && (
        <TagsGroup label={`${t('custom-table-columns.avg-loan-size')}:`} noWrap>
          <FilterTag label={avgLoanAmountLabel} onDelete={handleRemoveAvgLoanAmount} />
        </TagsGroup>
      )}
    </>
  )
})
