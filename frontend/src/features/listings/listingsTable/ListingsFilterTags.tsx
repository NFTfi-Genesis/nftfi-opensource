import { memo, useCallback } from 'react'

import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { WalletTag } from 'src/components/Tables/Toolbars/Elements/WalletTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { CurrencyTicker } from 'src/utils/currencies'
import { getTestId } from 'src/utils/testing'
import { Currency } from 'src/entities/domain/Currency'
import type { ListingsFilters } from 'src/services/fetchers/listing/getListings'
import type { ListingsFiltersStatus, UpdateListingsFilter } from './useListingsTableState'

interface ListingsFilterTagsProps {
  filters: ListingsFilters
  filtersDefaults: ListingsFilters
  updateFilter: UpdateListingsFilter
  filterStatus: ListingsFiltersStatus
}

export const ListingsFilterTags = memo(function ListingsFilterTags({
  filters,
  filtersDefaults,
  filterStatus,
  updateFilter,
}: ListingsFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveCollection = useCallback((collectionToRemove: string) => {
    const updatedCollections = filters.collections.filter(c => c.id !== collectionToRemove)
    updateFilter('collections', updatedCollections)
  }, [filters.collections, updateFilter])

  const handleRemoveBorrower = useCallback(() => {
    updateFilter('borrower', null)
  }, [updateFilter])

  const handleRemoveCurrency = useCallback(() => {
    updateFilter('currency', null)
  }, [updateFilter])

  const handleRemoveDuration = useCallback(() => {
    updateFilter('duration', filtersDefaults.duration)
  }, [filtersDefaults.duration, updateFilter])

  return (
    <>
      {filterStatus.hasCollections && (
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
      {filters.borrower && (
        <TagsGroup label={`${t('filters.borrower')}:`} {...getTestId('table.toolbar.borrower')}>
          <WalletTag wallet={filters.borrower} onDelete={handleRemoveBorrower} />
        </TagsGroup>
      )}
      {filters.currency && (
        <TagsGroup label={`${t('filters.currency')}:`} {...getTestId('table.toolbar.currency')}>
          <FilterTag label={CurrencyTicker[filters.currency as Currency]} onDelete={handleRemoveCurrency} />
        </TagsGroup>
      )}
      {filterStatus.hasDuration && (
        <TagsGroup label={`${t('filters.duration')}:`} noWrap>
          <FilterTag
            label={`${filters.duration} ${t('filters.days')}`}
            onDelete={handleRemoveDuration}
          />
        </TagsGroup>
      )}
    </>
  )
})
