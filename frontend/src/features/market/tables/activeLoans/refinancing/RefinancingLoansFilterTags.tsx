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
import { WalletTag } from 'src/components/Tables/Toolbars/Elements/WalletTag'
import { Address } from 'src/entities/base/Address'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { useWallet } from 'src/modules/wallet/useWallet'
import { RefinancingLoansFilters, RefinancingLoansFiltersStatus, UpdateRefinancingLoansFilter } from './useRefinancingLoansTableState'

interface RefinancingLoansFilterTagsProps {
  filters: RefinancingLoansFilters
  updateFilter: UpdateRefinancingLoansFilter
  filterStatus: RefinancingLoansFiltersStatus
}

export const RefinancingLoansFilterTags = memo(function RefinancingLoansFilterTags({ filters, updateFilter, filterStatus, }: RefinancingLoansFilterTagsProps) {
  const { walletAddress } = useWallet()
  const { t } = useTranslation()

  const handleRemoveCollection = useCallback((collectionToRemove: CollectionExtended<CollectionInfo>) => {
    const updatedCollections = filters.collections.filter(c => c.info.name !== collectionToRemove.info.name)
    updateFilter('collections', updatedCollections)
  }, [filters.collections, updateFilter])

  const handleRemoveWallet = useCallback(
    (wallet: Address) => {
      const newValue = filters.wallets?.filter(w => w !== wallet)
      updateFilter('wallets', newValue)
    },
    [filters.wallets, updateFilter]
  )

  const handleRemoveCurrency = useCallback(
    (inputValue: Currency) => {
      const newValue = filters.currency?.filter(item => item !== inputValue)
      updateFilter('currency', newValue)
    },
    [filters.currency, updateFilter]
  )

  const handleRemoveProtocol = useCallback(
    (inputValue: Protocol) => {
      const newValue = filters.protocol?.filter(item => item !== inputValue)
      updateFilter('protocol', newValue)
    },
    [filters.protocol, updateFilter]
  )

  const handleRemoveDueWithin = useCallback(() => {
    updateFilter('dueWithin', null)
  }, [updateFilter])

  return (
    <>
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
      {filterStatus.hasProtocol && (
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
          <FilterTag label={DueWithinLabels[filters?.dueWithin as DueWithin]} onDelete={handleRemoveDueWithin} />
        </TagsGroup>
      )}
      {filterStatus.hasWallets && (
        <TagsGroup label={`${t('filters.wallet')}:`} {...getTestId('table.toolbar.wallet')}>
          {filters.wallets.map(wallet => (
            <WalletTag
              key={wallet}
              wallet={wallet}
              onDelete={
                wallet === walletAddress
                  ? undefined
                  : () => handleRemoveWallet(wallet)
              }
            />
          ))}
        </TagsGroup>
      )}
    </>
  )
})
