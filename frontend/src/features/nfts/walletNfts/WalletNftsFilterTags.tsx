import { memo, useCallback } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { getWalletNftsStatusDisplayText } from 'src/utils/listings'
import {
  WalletNftsFilters,
  UpdateWalletNftsFilter,
  WalletNftsFiltersStatus,
} from './types'

type WalletNftsFilterTagsProps = {
  filters: WalletNftsFilters
  filtersDefaults: WalletNftsFilters
  updateFilter: UpdateWalletNftsFilter
  filterStatus: WalletNftsFiltersStatus
}

export const WalletNftsFilterTags = memo(function WalletNftsFilterTags({
  filters,
  filtersDefaults,
  updateFilter,
  filterStatus,
}: WalletNftsFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveCollection = useCallback((collectionToRemove: string) => {
    const updatedCollections = filters.collection.filter(c => c !== collectionToRemove)
    updateFilter('collection', updatedCollections)
  }, [filters.collection, updateFilter])

  const handleRemoveStatus = useCallback(() => {
    updateFilter('status', filtersDefaults.status)
  }, [filtersDefaults.status, updateFilter])

  return (
    <>
      {filterStatus.hasCollection && filters.collection.length > 0 && (
        <TagsGroup label={`${t('filters.collection')}:`} noWrap>
          {filters.collection.map(collection => (
            <FilterTag
              key={collection}
              label={collection}
              onDelete={() => handleRemoveCollection(collection)}
            />
          ))}
        </TagsGroup>
      )}

      {filterStatus.hasStatus && (
        <TagsGroup label='Status:' noWrap>
          <FilterTag label={getWalletNftsStatusDisplayText(filters.status, t)} onDelete={handleRemoveStatus} />
        </TagsGroup>
      )}
    </>
  )
})
