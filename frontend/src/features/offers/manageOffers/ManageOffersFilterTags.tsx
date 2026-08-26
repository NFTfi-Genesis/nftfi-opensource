import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { WalletTag } from 'src/components/Tables/Toolbars/Elements/WalletTag'
import { getCurrencyOptionsDisplayText, getIsProratedOptionsDisplayText } from 'src/utils/terms'
import { formatAmount } from 'src/utils/amounts'
import { Amount } from 'src/entities/base/Amount'
import { Currency } from 'src/entities/domain/Currency'
import {
  ManageOffersFilters,
  ManageOffersFiltersStatus,
  UpdateManageOffersFilter,
} from './useManageOffersTableState'

type ManageOffersFilterTagsProps = {
  filters: ManageOffersFilters
  filtersDefaults: ManageOffersFilters
  updateFilter: UpdateManageOffersFilter
  filterStatus: ManageOffersFiltersStatus
}

export const ManageOffersFilterTags = memo(function ManageOffersFilterTags({
  filters,
  filtersDefaults,
  updateFilter,
  filterStatus,
}: ManageOffersFilterTagsProps) {
  const { t } = useTranslation()

  const handleRemoveCollectionOffersOnly = useCallback(() => {
    updateFilter('showCollectionOffersOnly', filtersDefaults.showCollectionOffersOnly)
  }, [filtersDefaults.showCollectionOffersOnly, updateFilter])

  const handleRemoveCurrency = useCallback(() => {
    updateFilter('currency', filtersDefaults.currency)
  }, [filtersDefaults.currency, updateFilter])

  const handleRemovePrincipalRange = useCallback(() => {
    updateFilter('principalRange', filtersDefaults.principalRange)
  }, [filtersDefaults.principalRange, updateFilter])

  const handleRemoveLoanType = useCallback(() => {
    updateFilter('isProRated', filtersDefaults.isProRated)
  }, [filtersDefaults.isProRated, updateFilter])

  const handleRemoveMaxApr = useCallback(() => {
    updateFilter('maxApr', filtersDefaults.maxApr)
  }, [filtersDefaults.maxApr, updateFilter])

  const handleRemoveOriginationFee = useCallback(() => {
    updateFilter('withoutOriginationFee', filtersDefaults.withoutOriginationFee)
  }, [filtersDefaults.withoutOriginationFee, updateFilter])

  const handleRemoveActiveLoansOnly = useCallback(() => {
    updateFilter('activeLoansOnly', filtersDefaults.activeLoansOnly)
  }, [filtersDefaults.activeLoansOnly, updateFilter])

  const handleRemoveDuration = useCallback(() => {
    updateFilter('duration', filtersDefaults.duration)
  }, [filtersDefaults.duration, updateFilter])

  const handleRemoveBorrowerAddress = useCallback(() => {
    updateFilter('borrowerAddress', filtersDefaults.borrowerAddress)
  }, [filtersDefaults.borrowerAddress, updateFilter])

  const principalLabel = useMemo(() => {
    const [min, max] = filters.principalRange

    const minFormatted = formatAmount(min as Amount, Currency.USD, {
      compactThreshold: 5,
    })
    const maxFormatted = formatAmount(max as Amount, Currency.USD, {
      compactThreshold: 5,
    })

    return `$${minFormatted} - $${maxFormatted}`
  }, [filters.principalRange])

  return (
    <>
      {filterStatus.hasCollectionOffersOnly && (
        <TagsGroup label={`${t('filters.filter')}:`} noWrap>
          <FilterTag
            label={t('navigation.collection-offers')}
            onDelete={handleRemoveCollectionOffersOnly}
          />
        </TagsGroup>
      )}

      {filterStatus.hasCurrency && (
        <TagsGroup label={`${t('filters.currency')}:`} noWrap>
          <FilterTag
            label={getCurrencyOptionsDisplayText(filters.currency, t)}
            onDelete={handleRemoveCurrency}
          />
        </TagsGroup>
      )}

      {filterStatus.hasPrincipalRange && (
        <TagsGroup label={`${t('custom-table-columns.principal')}:`} noWrap>
          <FilterTag label={principalLabel} onDelete={handleRemovePrincipalRange} />
        </TagsGroup>
      )}

      {filterStatus.hasLoanType && (
        <TagsGroup label={`${t('filters.loan-type')}:`} noWrap>
          <FilterTag label={getIsProratedOptionsDisplayText(filters.isProRated, t)} onDelete={handleRemoveLoanType} />
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

      {filterStatus.hasActiveLoansOnly && (
        <TagsGroup label={`${t('filters.filter')}:`} noWrap>
          <FilterTag
            label={t('custom-table-columns.offer-status-active')}
            onDelete={handleRemoveActiveLoansOnly}
          />
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

      {filterStatus.hasBorrowerAddress && filters.borrowerAddress && (
        <TagsGroup label={`${t('filters.borrower')}:`} noWrap>
          <WalletTag wallet={filters.borrowerAddress} onDelete={handleRemoveBorrowerAddress} />
        </TagsGroup>
      )}
    </>
  )
})
