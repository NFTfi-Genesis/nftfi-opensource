import { memo, useCallback } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Currency } from 'src/entities/domain/Currency'
import { CurrencyTicker } from 'src/utils/currencies'
import { DueWithin, DueWithinLabels } from 'src/utils/dueWithin'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolDisplayNames } from 'src/utils/protocols'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { getTestId } from 'src/utils/testing'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { BorrowerLoansFilters, BorrowerLoansFiltersStatus, UpdateBorrowerLoansFilter } from './useBorrowerLoansTableState'

export type BorrowerLoansFilterTagsProps = {
  filters: BorrowerLoansFilters
  updateFilter: UpdateBorrowerLoansFilter
  filterStatus: BorrowerLoansFiltersStatus
}

export const BorrowerLoansFilterTags = memo(function BorrowerLoansFilterTags({ filters, updateFilter, filterStatus }: BorrowerLoansFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveCollection = useCallback((collectionToRemove: CollectionExtended<CollectionInfo>) => {
    const updatedCollections = filters.collections.filter(c => c.id !== collectionToRemove.id)
    updateFilter('collections', updatedCollections)
  }, [filters.collections, updateFilter])

  const handleRemoveProtocol = useCallback(
    (inputValue: Protocol) => {
      const newValue = filters.protocol.filter(item => item !== inputValue)
      updateFilter('protocol', newValue)
    },
    [filters.protocol, updateFilter]
  )

  const handleRemoveCurrency = useCallback(
    (inputValue: Currency) => {
      const newValue = filters.currency.filter(item => item !== inputValue)
      updateFilter('currency', newValue)
    },
    [filters.currency, updateFilter]
  )

  const handleRemoveDueWithin = useCallback(() => {
    updateFilter('dueWithin', null)
  }, [updateFilter])

  const handleRemoveOnlyNftfi = useCallback(() => {
    updateFilter('onlyNftfi', false)
  }, [updateFilter])

  return (
    <>
      {filterStatus.hasOnlyNftfi && (
        <TagsGroup label={`${t('filters.protocol')}:`} {...getTestId('table.toolbar.onlyNftfi')}>
          <FilterTag label={t('borrow.filters.only-nftfi-tag')} onDelete={handleRemoveOnlyNftfi} />
        </TagsGroup>
      )}
      {filterStatus.hasCollection && (
        <TagsGroup label={`${t('filters.collection')}:`} noWrap>
          {filters.collections.map(collection => (
            <FilterTag
              key={collection.id}
              label={collection.info.name}
              onDelete={() => handleRemoveCollection(collection)}
            />
          ))}
        </TagsGroup>
      )}
      {filterStatus.hasProtocol && !filterStatus.hasOnlyNftfi && (
        <TagsGroup label={`${t('filters.protocol')}:`} {...getTestId('table.toolbar.protocol')}>
          {filters.protocol.map(item => (
            <FilterTag key={item} label={ProtocolDisplayNames[item]} onDelete={() => handleRemoveProtocol(item)} />
          ))}
        </TagsGroup>
      )}
      {filterStatus.hasCurrency && (
        <TagsGroup label={`${t('filters.currency')}:`} {...getTestId('table.toolbar.currency')}>
          {filters.currency.map(item => (
            <FilterTag key={item} label={CurrencyTicker[item]} onDelete={() => handleRemoveCurrency(item)} />
          ))}
        </TagsGroup>
      )}
      {filterStatus.hasDueWithin && (
        <TagsGroup label={`${t('filters.due-within')}:`} {...getTestId('table.toolbar.dueWithin')}>
          <FilterTag label={DueWithinLabels[filters.dueWithin as DueWithin]} onDelete={handleRemoveDueWithin} />
        </TagsGroup>
      )}
    </>
  )
})
