import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { pick } from 'lodash'
import { Address } from 'src/entities/base/Address'
import {
  getCurrencyFromName,
  CurrencyTicker,
} from 'src/utils/currencies'
import { Currency } from 'src/entities/domain/Currency'
import { getProtocolFromName, ProtocolApiKeys } from 'src/utils/protocols'
import { Protocol } from 'src/entities/domain/Protocol'
import { CollectionId } from 'src/entities/domain/Collection'
import { DueWithin } from 'src/utils/dueWithin'

export type MarketFilters = {
  protocol?: Protocol[]
  collectionIds?: CollectionId[]
  currency?: Currency[]
  dueWithin?: DueWithin | null
  wallets?: Address[]
  lender?: Address | null
  borrower?: Address | null
}

export type MarketFiltersUpdate = Partial<
  Omit<MarketFilters, 'wallets'> & { wallets: string | string[] }
>

function getFiltersFromSearchParams(
  searchParams: URLSearchParams
): MarketFilters {
  const protocolParam = searchParams.get('protocol')
  const currencyParam = searchParams.get('currency')

  return {
    protocol: protocolParam
      ? protocolParam
        .split(',')
        .map(getProtocolFromName)
        .filter((p): p is Protocol => p !== null)
      : [],
    collectionIds: searchParams.get('collectionIds')?.split(',') || [],
    currency: currencyParam
      ? currencyParam
        .split(',')
        .map(getCurrencyFromName)
        .filter((c): c is Currency => c !== null)
      : [],
    dueWithin: searchParams.get('dueWithin')
      ? (Number(searchParams.get('dueWithin')) as DueWithin)
      : null,
    wallets: (searchParams.get('wallets')?.split(',') || []) as Address[],
    lender: (searchParams.get('lender') || '') as Address,
    borrower: (searchParams.get('borrower') || '') as Address,
  }
}

const paramHandlers = {
  collectionIds: (val: CollectionId[]) => val.join(','),
  protocol: (val: Protocol[]) => val.map(p => ProtocolApiKeys[p]).join(','),
  currency: (val: Currency[]) =>
    val.map(c => CurrencyTicker[c]).join(','),
  dueWithin: (val: DueWithin | null) => val?.toString() || '',
  wallets: (val: string | string[], currentParams: URLSearchParams) => {
    if (Array.isArray(val)) return val.join(',')

    const currentWallets = currentParams.get('wallets')?.split(',') || []
    return [...new Set([...currentWallets, val])].join(',')
  },
  lender: (val: string | null) => val?.toString() || '',
  borrower: (val: string | null) => val?.toString() || '',
}

type ParamHandlerKey = keyof typeof paramHandlers

function getHandler<K extends ParamHandlerKey>(
  key: K
): (val: MarketFiltersUpdate[K], currentParams?: URLSearchParams) => string {
  return paramHandlers[key] as (
    val: MarketFiltersUpdate[K],
    currentParams?: URLSearchParams
  ) => string
}

export function useMarketFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const filters = useMemo(() => {
    return getFiltersFromSearchParams(searchParams)
  }, [searchParams])

  const handleChangeFilters = useCallback(
    (
      filtersToUpdate: MarketFiltersUpdate,
      resetPageCallback?: (params: URLSearchParams) => URLSearchParams
    ) => {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev)

        const shouldClearLenderAndBorrower = Object.keys(filtersToUpdate).some(
          key => key !== 'lender' && key !== 'borrower'
        )
        if (shouldClearLenderAndBorrower) {
          newParams.delete('lender')
          newParams.delete('borrower')
        }

        Object.entries(filtersToUpdate).forEach(([key, value]) => {
          const isEmptyValue = !value || (Array.isArray(value) && !value.length)
          if (isEmptyValue) {
            newParams.delete(key)
            return
          }

          const hasParamHandler = key in paramHandlers
          if (!hasParamHandler) {
            return
          }

          const handler = getHandler(key as ParamHandlerKey)
          let paramValue: string

          if (key === 'wallets') {
            paramValue = handler(value, newParams)
          } else {
            paramValue = handler(value, undefined)
          }

          newParams.set(key, paramValue)
        })

        if (resetPageCallback) {
          return resetPageCallback(newParams)
        }

        return newParams
      })
    },
    [setSearchParams]
  )

  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const pickFilters = useCallback(
    <K extends keyof MarketFilters>(keys: K[]) => {
      return pick(filters, keys) as Pick<MarketFilters, K>
    },
    [filters]
  )

  // Get route-based filters (which filters to include based on current pathname)
  const getRouteBasedFilters = useCallback(
    <K extends keyof MarketFilters>(baseFilters: readonly K[]) => {
      const isLendersOrBorrowersPage = location.pathname.includes('/market/lenders')
        || location.pathname.includes('/market/borrowers')

      if (isLendersOrBorrowersPage) {
        return pickFilters([...baseFilters])
      }

      return pickFilters([...baseFilters, 'wallets'] as K[])
    },
    [location.pathname, pickFilters]
  )

  // Ref to track previous pathname
  const prevPathnameRef = useRef<string | null>(null)

  // Handle filters when changing routes
  useEffect(() => {
    // Only run when pathname actually changes. Avoids infinite url params updates.
    if (prevPathnameRef.current === location.pathname) {
      return
    }
    prevPathnameRef.current = location.pathname

    const isMarketActiveLoansPage = location.pathname === '/market/active-loans'
    const isMarketLendersPage = location.pathname === '/market/lenders'
    const isMarketBorrowersPage = location.pathname === '/market/borrowers'
    const isRootPage = location.pathname === '/'

    // Within market pages, clean up page-specific filters
    if (isMarketActiveLoansPage || isRootPage) {
      handleChangeFilters({
        borrower: null,
        lender: null,
      })
    } else if (isMarketLendersPage) {
      handleChangeFilters({ borrower: null })
    } else if (isMarketBorrowersPage) {
      handleChangeFilters({ lender: null })
    }
  }, [location.pathname, handleChangeFilters, clearAllFilters])

  return {
    filters,
    pickFilters,
    getRouteBasedFilters,
    handleChangeFilters,
    clearAllFilters,
  }
}
