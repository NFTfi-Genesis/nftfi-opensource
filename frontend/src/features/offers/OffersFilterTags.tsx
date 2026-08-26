import { memo, useCallback } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { WalletTag } from 'src/components/Tables/Toolbars/Elements/WalletTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { getCurrencyOptionsDisplayText, getIsProratedOptionsDisplayText } from 'src/utils/terms'
import {
  OffersFilters as OffersFiltersState,
  UpdateOffersFilter,
  OffersFiltersStatus,
} from './useOffersTablesState'

type OffersFilterTagsProps = {
  filters: OffersFiltersState
  filtersDefaults: OffersFiltersState
  updateFilter: UpdateOffersFilter
  filterStatus: OffersFiltersStatus
}

export const OffersFilterTags = memo(function OffersFilterTags({
  filters,
  filtersDefaults,
  updateFilter,
  filterStatus,
}: OffersFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveLoanType = useCallback(() => {
    updateFilter('isProRated', filtersDefaults.isProRated)
  }, [filtersDefaults.isProRated, updateFilter])

  const handleRemoveCurrency = useCallback(() => {
    updateFilter('currency', filtersDefaults.currency)
  }, [filtersDefaults.currency, updateFilter])

  const handleRemoveMaxApr = useCallback(() => {
    updateFilter('maxApr', filtersDefaults.maxApr)
  }, [filtersDefaults.maxApr, updateFilter])

  const handleRemoveOriginationFee = useCallback(() => {
    updateFilter('withoutOriginationFee', filtersDefaults.withoutOriginationFee)
  }, [filtersDefaults.withoutOriginationFee, updateFilter])

  const handleRemoveDuration = useCallback(() => {
    updateFilter('duration', filtersDefaults.duration)
  }, [filtersDefaults.duration, updateFilter])

  const handleRemoveLenderAddress = useCallback(
    (address: string) => {
      const newValue = filters.lenderAddresses.filter(a => a !== address)
      updateFilter('lenderAddresses', newValue)
    },
    [filters.lenderAddresses, updateFilter]
  )

  return (
    <>
      {filterStatus.hasLoanType && (
        <TagsGroup label={`${t('filters.loan-type')}:`} noWrap>
          <FilterTag label={getIsProratedOptionsDisplayText(filters.isProRated, t)} onDelete={handleRemoveLoanType} />
        </TagsGroup>
      )}

      {filterStatus.hasCurrency && (
        <TagsGroup label={`${t('filters.currency')}:`} noWrap>
          <FilterTag
            label={
              filters.currency === null
                ? t('filters.any')
                : getCurrencyOptionsDisplayText(filters.currency, t)
            }
            onDelete={handleRemoveCurrency}
          />
        </TagsGroup>
      )}

      {filterStatus.hasMaxApr && (
        <TagsGroup label={`${t('filters.max-apr')}:`} noWrap>
          <FilterTag label={`≤${filters.maxApr}%`} onDelete={handleRemoveMaxApr} />
        </TagsGroup>
      )}

      {filterStatus.hasOriginationFee && (
        <TagsGroup label={`${t('filters.origination-fee')}:`} noWrap>
          <FilterTag label={t('filters.without-fee')} onDelete={handleRemoveOriginationFee} />
        </TagsGroup>
      )}

      {filterStatus.hasDuration && (
        <TagsGroup label={`${t('filters.duration')}:`} noWrap>
          <FilterTag
            label={`${filters.duration} ${t('filters.days')} ${t('filters.or-more')}`}
            onDelete={handleRemoveDuration}
          />
        </TagsGroup>
      )}

      {filterStatus.hasLenderAddresses && (
        <TagsGroup label={`${t('filters.lender')}:`} noWrap>
          {filters.lenderAddresses.map(address => (
            <WalletTag key={address} wallet={address} onDelete={() => handleRemoveLenderAddress(address)} />
          ))}
        </TagsGroup>
      )}
    </>
  )
})
