import { memo, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Currency } from 'src/entities/domain/Currency'
import { CurrencyTicker } from 'src/utils/currencies'
import { DueWithin, DueWithinLabels } from 'src/utils/dueWithin'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolDisplayNames } from 'src/utils/protocols'
import { FilterTag } from 'src/components/Tables/Toolbars/Elements/FilterTag'
import { WalletTag } from 'src/components/Tables/Toolbars/Elements/WalletTag'
import { TagsGroup } from 'src/components/Tables/Toolbars/Elements/TagsGroup'
import { MarketFilters, useMarketFilters } from 'src/features/market/tables/useMarketFilters'
import { useAllActiveCollections } from 'src/services/hooks/collection/useAllActiveCollections'
import { CollectionId } from 'src/entities/domain/Collection'
import { getTestId } from 'src/utils/testing'

interface MarketFilterTagsProps {
  resetPage?: (currentParams: URLSearchParams) => URLSearchParams
}

export const DashboardFilterTags = memo(function DashboardFilterTags({ resetPage }: MarketFilterTagsProps) {
  const { t } = useTranslation()
  const { handleChangeFilters, pickFilters } = useMarketFilters()
  const location = useLocation()

  const filterKeys = useMemo((): (keyof MarketFilters)[] => {
    const isLendRefinancePage = location.pathname === '/lend/refinance'
    const isMarketActiveLoansPage = location.pathname === '/market/active-loans'
    const isMarketLendersPage = location.pathname === '/market/lenders'
    const isMarketBorrowersPage = location.pathname === '/market/borrowers'
    const isRootPage = location.pathname === '/'

    const commonFilters: (keyof MarketFilters)[] = ['collectionIds', 'currency', 'dueWithin']

    if (isMarketLendersPage) {
      return ['protocol', ...commonFilters, 'lender']
    } else if (isMarketBorrowersPage) {
      return ['protocol', ...commonFilters, 'borrower']
    } else if (isLendRefinancePage) {
      return [...commonFilters, 'wallets']
    } else if (isMarketActiveLoansPage || isRootPage) {
      return ['protocol', ...commonFilters, 'wallets']
    }
    return [...commonFilters]
  }, [location.pathname])

  const filters = useMemo(() => pickFilters(filterKeys), [pickFilters, filterKeys])

  const collectionsPrefetchFilters = useMemo(
    () => pickFilters(['protocol', 'currency', 'dueWithin']),
    [pickFilters]
  )
  const { data: allCollections } = useAllActiveCollections({ filters: collectionsPrefetchFilters })
  const collectionNameById = useMemo(
    () => new Map((allCollections ?? []).map(c => [c.id, c.info.name])),
    [allCollections]
  )

  const handleRemoveCollectionId = useCallback(
    (inputValue: CollectionId) => {
      const newValue = filters.collectionIds?.filter(item => item !== inputValue)
      handleChangeFilters({ collectionIds: newValue }, resetPage)
    },
    [filters.collectionIds, handleChangeFilters, resetPage]
  )

  const handleRemoveProtocol = useCallback(
    (inputValue: Protocol) => {
      const newValue = filters.protocol?.filter(item => item !== inputValue)
      handleChangeFilters({ protocol: newValue }, resetPage)
    },
    [filters.protocol, handleChangeFilters, resetPage]
  )

  const handleRemoveCurrency = useCallback(
    (inputValue: Currency) => {
      const newValue = filters.currency?.filter(item => item !== inputValue)
      handleChangeFilters({ currency: newValue }, resetPage)
    },
    [filters.currency, handleChangeFilters, resetPage]
  )

  const handleRemoveDueWithin = useCallback(() => {
    handleChangeFilters({ dueWithin: null }, resetPage)
  }, [handleChangeFilters, resetPage])

  const handleRemoveWallet = useCallback(
    (wallet: string) => {
      const newValue = filters.wallets?.filter(w => w !== wallet)
      handleChangeFilters({ wallets: newValue }, resetPage)
    },
    [filters.wallets, handleChangeFilters, resetPage]
  )

  return (
    <>
      {!!filters.collectionIds?.length && (
        <TagsGroup label={`${t('filters.collection')}:`} {...getTestId('table.toolbar.collection')}>
          {filters.collectionIds.map(id => (
            <FilterTag
              key={id}
              label={collectionNameById.get(id) ?? id}
              onDelete={() => handleRemoveCollectionId(id)}
              sx={{
                maxWidth: {
                  xs: '185px',
                  md: 'none',
                },
              }}
            />
          ))}
        </TagsGroup>
      )}
      {!!filters.protocol?.length && (
        <TagsGroup label={`${t('filters.protocol')}:`} {...getTestId('table.toolbar.protocol')}>
          {filters.protocol.map(item => (
            <FilterTag key={item} label={ProtocolDisplayNames[item]} onDelete={() => handleRemoveProtocol(item)} />
          ))}
        </TagsGroup>
      )}
      {!!filters.currency?.length && (
        <TagsGroup label={`${t('filters.currency')}:`} {...getTestId('table.toolbar.currency')}>
          {filters.currency.map(item => (
            <FilterTag key={item} label={CurrencyTicker[item]} onDelete={() => handleRemoveCurrency(item)} />
          ))}
        </TagsGroup>
      )}
      {!!filters.dueWithin && (
        <TagsGroup label={`${t('filters.due-within')}:`} {...getTestId('table.toolbar.dueWithin')}>
          <FilterTag label={DueWithinLabels[filters?.dueWithin as DueWithin]} onDelete={handleRemoveDueWithin} />
        </TagsGroup>
      )}
      {!!filters.wallets?.length && (
        <TagsGroup label={`${t('filters.wallet')}:`} {...getTestId('table.toolbar.wallet')}>
          {filters.wallets.map(wallet => (
            <WalletTag key={wallet} wallet={wallet} onDelete={() => handleRemoveWallet(wallet)} />
          ))}
        </TagsGroup>
      )}
      {!!filters.lender && (
        <TagsGroup label={`${t('filters.lender')}:`} {...getTestId('table.toolbar.lender')}>
          <WalletTag wallet={filters.lender} onDelete={() => handleChangeFilters({ lender: undefined }, resetPage)} />
        </TagsGroup>
      )}
      {!!filters.borrower && (
        <TagsGroup label={`${t('filters.borrower')}:`} {...getTestId('table.toolbar.borrower')}>
          <WalletTag
            wallet={filters.borrower}
            onDelete={() => handleChangeFilters({ borrower: undefined }, resetPage)}
          />
        </TagsGroup>
      )}
    </>
  )
})
