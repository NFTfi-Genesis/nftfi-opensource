import { useLocation } from 'react-router-dom'
import { useCallback, useMemo } from 'react'
import { Stack } from '@mui/material'
import { ActiveCollectionsAutocomplete } from 'src/components/Autocomplete/ActiveCollectionsAutocomplete'
import { ProtocolAutocomplete } from 'src/components/Autocomplete/ProtocolAutocomplete'
import { CurrencySelect } from 'src/components/Select/CurrencySelect'
import { DueSelect } from 'src/components/Select/DueSelect'
import { WalletAddressesInput } from 'src/components/Forms/WalletAddressesInput'
import { Address } from 'src/entities/base/Address'
import { useMarketFilters, MarketFiltersUpdate } from 'src/features/market/tables/useMarketFilters'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { getTestId } from 'src/utils/testing'
import { useAllActiveCollections } from 'src/services/hooks/collection/useAllActiveCollections'

interface MarketFiltersFormProps {
  resetPage?: (currentParams: URLSearchParams) => URLSearchParams
}

export function MarketFiltersForm({ resetPage }: MarketFiltersFormProps) {
  const { t } = useTranslation()
  const { filters, handleChangeFilters, getRouteBasedFilters } = useMarketFilters()
  const { pathname } = useLocation()
  const isLendRefinancePage = pathname === '/lend/refinance'
  const isMarketLendersPage = pathname === '/market/lenders'
  const isMarketBorrowersPage = pathname === '/market/borrowers'

  const shouldShowWallets = !isMarketLendersPage && !isMarketBorrowersPage
  const shouldShowProtocol = !isLendRefinancePage

  // Prefetch collections for ProjectsAutocomplete
  const prefetchFilters = useMemo(() => {
    const baseFilters = ['protocol', 'currency', 'dueWithin'] as const
    return getRouteBasedFilters(baseFilters)
  }, [getRouteBasedFilters])

  useAllActiveCollections({ filters: prefetchFilters })

  const handleChange = useCallback(
    (filtersToUpdate: MarketFiltersUpdate) => {
      handleChangeFilters(filtersToUpdate, resetPage)
    },
    [handleChangeFilters, resetPage]
  )

  const handleWalletsChange = useCallback(
    (addresses: Address[]) => {
      handleChange({ wallets: addresses })
    },
    [handleChange]
  )

  return (
    <Stack gap={2}>
      <ActiveCollectionsAutocomplete
        onChange={handleChange}
        collectionIds={filters.collectionIds}
        filters={prefetchFilters}
        {...getTestId('dashboard.filters.project')}
      />
      {shouldShowProtocol && (
        <ProtocolAutocomplete
          onChange={handleChange}
          protocol={filters.protocol}
          {...getTestId('dashboard.filters.protocol')}
        />
      )}
      <CurrencySelect
        onChange={handleChange}
        currency={filters.currency}
        {...getTestId('dashboard.filters.currency')}
      />
      <DueSelect onChange={handleChange} due={filters.dueWithin} {...getTestId('dashboard.filters.dueIn')} />
      {shouldShowWallets && (
        <WalletAddressesInput
          label={t('filters.wallet')}
          value={filters.wallets || []}
          onChange={handleWalletsChange}
        />
      )}
    </Stack>
  )
}
