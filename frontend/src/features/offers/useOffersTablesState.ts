import { useState, useMemo, useCallback, useEffect } from 'react'
import { Address } from 'src/entities/base/Address'
import { Offer } from 'src/entities/domain/Offer'
import { Currency } from 'src/entities/domain/Currency'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { SortParams, SortOrder } from 'src/entities/app/SortParams'
import { CurrencyOptions } from 'src/utils/terms'
import { useFxRate } from 'src/services/hooks/ethereum/useFxRate'
import { convertWeiToUsd } from 'src/utils/amounts'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'

export const offerDurationPresetOptions = [7, 14, 30, 60, 90, 365]

export type OffersFilters = {
  isProRated: boolean | null
  currency: CurrencyOptions
  maxApr: number
  withoutOriginationFee: boolean
  duration: number
  lenderAddresses: Address[]
}

export type OffersFilterState = {
  filters: OffersFilters
  filtersDefaults: OffersFilters
  updateFilter: UpdateOffersFilter
  filterStatus: OffersFiltersStatus
  resetAllFilters: () => void
}

const maxRangeFiltersValues: OffersFilters = {
  isProRated: null,
  currency: null,
  maxApr: 100,
  withoutOriginationFee: false,
  duration: 365,
  lenderAddresses: [],
}

function getFilterDefaultsFromOffersData<TOffers extends Offer[]>(offers: TOffers | null): OffersFilters {
  if (!offers || offers.length === 0) {
    return maxRangeFiltersValues
  }

  const aprValues = offers.map(offer => offer.terms.apr)
  const maxAprInData = aprValues.length > 0
    ? Math.ceil(Math.max(...aprValues))
    : maxRangeFiltersValues.maxApr

  const durationValues = offers.map(offer => Math.floor(Number(offer.terms.duration) / (24 * 60 * 60)))
  const minDurationInData = durationValues.length > 0
    ? Math.floor(Math.min(...durationValues))
    : maxRangeFiltersValues.duration

  return {
    isProRated: null,
    currency: null,
    maxApr: maxAprInData,
    withoutOriginationFee: false,
    duration: minDurationInData,
    lenderAddresses: [],
  }
}

export type UpdateOffersFilter = <K extends keyof OffersFilters>(key: K, value: OffersFilters[K]) => void

export type OffersFiltersStatus = {
  hasLoanType: boolean
  hasCurrency: boolean
  hasMaxApr: boolean
  hasOriginationFee: boolean
  hasDuration: boolean
  hasLenderAddresses: boolean
  hasActiveFilters: boolean
}

export function useOffersTablesState<TOffers extends Offer[]>(offers: TOffers | null) {
  const { data: fxRate } = useFxRate()

  const [density, setDensity] = useLocalStorage(LocalStorageKeys.OffersTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.OffersTable.HiddenColumns
  )

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(TablePageSizes.Size25)
  const [sortingParams, setSortingParams] = useState<SortParams>({
    sortBy: 'apr',
    sortOrder: SortOrder.ASC,
  })

  // Filters
  const filtersDefaults = useMemo(() => getFilterDefaultsFromOffersData(offers), [offers])
  const [filters, setFilters] = useState<OffersFilters>(filtersDefaults)
  const [userModifiedFilterKeys, setUserModifiedFilterKeys] = useState<Set<keyof OffersFilters>>(new Set())

  // When defaults change, only update filters that the user hasn't modified
  // e.g. user set currency=USDC, then APR default changes → currency stays USDC, APR gets new default
  useEffect(() => {
    setFilters(prev => ({
      isProRated: userModifiedFilterKeys.has('isProRated') ? prev.isProRated : filtersDefaults.isProRated,
      currency: userModifiedFilterKeys.has('currency') ? prev.currency : filtersDefaults.currency,
      maxApr: userModifiedFilterKeys.has('maxApr') ? prev.maxApr : filtersDefaults.maxApr,
      withoutOriginationFee: userModifiedFilterKeys.has('withoutOriginationFee')
        ? prev.withoutOriginationFee
        : filtersDefaults.withoutOriginationFee,
      duration: userModifiedFilterKeys.has('duration') ? prev.duration : filtersDefaults.duration,
      lenderAddresses: userModifiedFilterKeys.has('lenderAddresses')
        ? prev.lenderAddresses
        : filtersDefaults.lenderAddresses,
    }))
  }, [filtersDefaults, userModifiedFilterKeys])

  const updateFilter = useCallback<UpdateOffersFilter>((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setUserModifiedFilterKeys(prev => new Set(prev).add(key))
    setPage(0)
  }, [])

  const resetAllFilters = useCallback(() => {
    setFilters(filtersDefaults)
    setUserModifiedFilterKeys(new Set())
    setPage(0)
  }, [filtersDefaults])

  // Filter status
  const hasLoanType = filters.isProRated !== filtersDefaults.isProRated
  const hasCurrency = filters.currency !== filtersDefaults.currency
  const hasMaxApr = filters.maxApr !== filtersDefaults.maxApr
  const hasOriginationFee = filters.withoutOriginationFee !== filtersDefaults.withoutOriginationFee
  const hasDuration = filters.duration !== filtersDefaults.duration
  const hasLenderAddresses = filters.lenderAddresses.length > 0

  const filterStatus = useMemo<OffersFiltersStatus>(
    () => ({
      hasLoanType,
      hasCurrency,
      hasMaxApr,
      hasOriginationFee,
      hasDuration,
      hasLenderAddresses,
      hasActiveFilters:
        hasLoanType || hasCurrency || hasMaxApr || hasOriginationFee || hasDuration || hasLenderAddresses,
    }),
    [hasLoanType, hasCurrency, hasMaxApr, hasOriginationFee, hasDuration, hasLenderAddresses]
  )

  // Filtered data
  const filteredData = useMemo((): TOffers[number][] => {
    if (!offers || offers.length === 0) return []

    return offers.filter(offer => {
      if (filters.isProRated !== null) {
        const isFlexible = offer.terms.isProRated
        const matchesType
          = (filters.isProRated === true && isFlexible)
          || (filters.isProRated === false && !isFlexible)
        if (!matchesType) return false
      }

      if (filters.currency !== null) {
        if (offer.terms.currency !== (filters.currency as unknown as Currency)) {
          return false
        }
      }

      if (offer.terms.apr > filters.maxApr) {
        return false
      }

      if (filters.withoutOriginationFee && offer.terms.origination > 0n) {
        return false
      }

      const durationInDays = Math.floor(Number(offer.terms.duration) / (24 * 60 * 60))
      if (durationInDays < filters.duration) {
        return false
      }

      if (filters.lenderAddresses.length > 0) {
        if (!filters.lenderAddresses.map(addr => addr.toLowerCase()).includes(offer.lender.toLowerCase())) {
          return false
        }
      }

      return true
    })
  }, [offers, filters])

  // Sorted data
  const processedData = useMemo((): TOffers[number][] => {
    if (!filteredData.length) return []

    const sorted = [...filteredData].sort((a, b) => {
      const { sortBy, sortOrder } = sortingParams
      let aValue: number | bigint
      let bValue: number | bigint

      switch (sortBy) {
        case 'principal':
          aValue = fxRate
            ? convertWeiToUsd(a.terms.currency, a.terms.principal, fxRate)
            : a.terms.principal
          bValue = fxRate
            ? convertWeiToUsd(b.terms.currency, b.terms.principal, fxRate)
            : b.terms.principal
          break
        case 'loanType':
          aValue = a.terms.isProRated
            ? 1
            : 0
          bValue = b.terms.isProRated
            ? 1
            : 0
          break
        case 'apr':
          aValue = a.terms.apr
          bValue = b.terms.apr
          break
        case 'originationFee':
          aValue = a.terms.origination
          bValue = b.terms.origination
          break
        case 'effectiveApr':
          aValue = a.terms.effectiveApr
          bValue = b.terms.effectiveApr
          break
        case 'duration':
          aValue = Number(a.terms.duration)
          bValue = Number(b.terms.duration)
          break
        case 'repayment':
          aValue = fxRate
            ? convertWeiToUsd(a.terms.currency, a.terms.repayment, fxRate)
            : a.terms.repayment
          bValue = fxRate
            ? convertWeiToUsd(b.terms.currency, b.terms.repayment, fxRate)
            : b.terms.repayment
          break
        case 'expiry':
          aValue = a.expiry
          bValue = b.expiry
          break
        default:
          return 0
      }

      // Handle bigint comparison
      if (typeof aValue === 'bigint' && typeof bValue === 'bigint') {
        const comparison = aValue < bValue
          ? -1
          : aValue > bValue
            ? 1
            : 0
        return sortOrder === SortOrder.ASC
          ? comparison
          : -comparison
      }

      // Handle number comparison
      const comparison = (aValue as number) - (bValue as number)
      return sortOrder === SortOrder.ASC
        ? comparison
        : -comparison
    })

    return sorted
  }, [filteredData, sortingParams, fxRate])

  const handleSortChange = useCallback((field: string) => {
    setSortingParams(prev => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === SortOrder.ASC
        ? SortOrder.DESC
        : SortOrder.ASC,
    }))
  }, [])

  return {
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,

    // Sorting
    sortingParams,
    setSortingParams,
    handleSortChange,

    // Filters
    filters,
    filtersDefaults,
    updateFilter,
    resetAllFilters,
    filterStatus,

    // View prefs
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,

    // Processed data
    filteredData,
    processedData,
  }
}
