import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { SortOrder, SortParams } from 'src/entities/app/SortParams'
import { OfferStatus } from 'src/entities/domain/Offer'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { convertWeiToUsd } from 'src/utils/amounts'
import { Address } from 'src/entities/base/Address'
import { currencyOptions, isProratedOptions } from 'src/utils/terms'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { AssetOfferExtended, CollectionOfferExtended, ContractOfferExtended } from 'src/entities/app/OfferExtended'
import { getOffersMinMax, isAssetOffer, isCollectionOffer } from 'src/utils/offers'
import { useFxRate } from 'src/services/hooks/ethereum/useFxRate'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'

export type ManageOffersTableRow = AssetOfferExtended<OfferValidated>
| CollectionOfferExtended<OfferValidated>
| ContractOfferExtended<OfferValidated>

export type ManageOffersFilters = {
  showCollectionOffersOnly: boolean
  currency: (typeof currencyOptions)[number]
  principalRange: [number, number]
  isProRated: (typeof isProratedOptions)[number]
  maxApr: number
  withoutOriginationFee: boolean
  activeLoansOnly: boolean
  duration: number
  borrowerAddress: Address | null
  collections: CollectionExtended<CollectionInfo>[]
}

const defaultFilters: Omit<ManageOffersFilters, 'principalRange'> = {
  showCollectionOffersOnly: false,
  currency: null,
  isProRated: null,
  maxApr: 100,
  withoutOriginationFee: false,
  activeLoansOnly: false,
  duration: 0,
  borrowerAddress: null,
  collections: [],
}

export type UpdateManageOffersFilter = <K extends keyof ManageOffersFilters>(
  key: K,
  value: ManageOffersFilters[K]
) => void

export type ManageOffersFiltersStatus = {
  hasCollectionOffersOnly: boolean
  hasCurrency: boolean
  hasPrincipalRange: boolean
  hasLoanType: boolean
  hasMaxApr: boolean
  hasOriginationFee: boolean
  hasActiveLoansOnly: boolean
  hasDuration: boolean
  hasBorrowerAddress: boolean
  hasActiveFilters: boolean
}

export function useManageOffersTableState(rows: ManageOffersTableRow[]) {
  const { data: fxRate } = useFxRate()

  // ------------------ View preferences ------------------
  const [density, setDensity] = useLocalStorage(LocalStorageKeys.ManageOffersTable.Density)
  const [hiddenColumns, setHiddenColumns] = useLocalStorage(
    LocalStorageKeys.ManageOffersTable.HiddenColumns
  )

  // ------------------ Pagination ------------------
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(TablePageSizes.Size25)

  // ------------------ Sorting ------------------
  const [sortingParams, setSortingParams] = useState<SortParams>({
    sortBy: 'expiry',
    sortOrder: SortOrder.ASC,
  })
  const handleSortChange = useCallback((field: string) => {
    setSortingParams(prev => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === SortOrder.ASC
        ? SortOrder.DESC
        : SortOrder.ASC,
    }))
  }, [])

  // ------------------ Filters ------------------
  const defaultFiltersWithPrincipalRange = useRef<ManageOffersFilters>(getDefaultFiltersWithPrincipalRange(rows, fxRate))
  const previousPrincipalRange = useRef<[number, number]>(defaultFiltersWithPrincipalRange.current.principalRange)

  const [filters, setFilters] = useLocalStorage(LocalStorageKeys.ManageOffersTable.Filters)

  // Update ref and filters when principal range bounds actually change
  useEffect(() => {
    const newDefaults = getDefaultFiltersWithPrincipalRange(rows, fxRate)
    const [newMin, newMax] = newDefaults.principalRange
    const [prevMin, prevMax] = previousPrincipalRange.current

    // Only update if the principal range actually changed
    if (newMin !== prevMin || newMax !== prevMax) {
      defaultFiltersWithPrincipalRange.current = newDefaults
      previousPrincipalRange.current = newDefaults.principalRange
      setFilters(newDefaults)
    }
  }, [rows, fxRate, setFilters])

  const updateFilter = useCallback<UpdateManageOffersFilter>((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }, [setFilters])

  const resetAllFilters = useCallback(() => {
    setFilters(defaultFiltersWithPrincipalRange.current)
    setPage(0)
  }, [setFilters])

  // Filter status
  const hasCollectionOffersOnly = filters.showCollectionOffersOnly !== defaultFilters.showCollectionOffersOnly
  const hasCurrency = filters.currency !== defaultFilters.currency
  const hasPrincipalRange = filters.principalRange[0] !== defaultFiltersWithPrincipalRange.current.principalRange[0]
    || filters.principalRange[1] !== defaultFiltersWithPrincipalRange.current.principalRange[1]
  const hasLoanType = filters.isProRated !== defaultFilters.isProRated
  const hasMaxApr = filters.maxApr !== defaultFilters.maxApr
  const hasOriginationFee = filters.withoutOriginationFee !== defaultFilters.withoutOriginationFee
  const hasActiveLoansOnly = filters.activeLoansOnly !== defaultFilters.activeLoansOnly
  const hasDuration = filters.duration !== defaultFilters.duration
  const hasBorrowerAddress = filters.borrowerAddress !== null

  const filterStatus = useMemo<ManageOffersFiltersStatus>(() => ({
    hasCollectionOffersOnly,
    hasCurrency,
    hasPrincipalRange,
    hasLoanType,
    hasMaxApr,
    hasOriginationFee,
    hasActiveLoansOnly,
    hasDuration,
    hasBorrowerAddress,
    hasActiveFilters: hasCollectionOffersOnly
      || hasCurrency
      || hasPrincipalRange
      || hasLoanType
      || hasMaxApr
      || hasOriginationFee
      || hasActiveLoansOnly
      || hasDuration
      || hasBorrowerAddress,
  }), [
    hasActiveLoansOnly,
    hasBorrowerAddress,
    hasCollectionOffersOnly,
    hasCurrency,
    hasDuration,
    hasLoanType,
    hasMaxApr,
    hasOriginationFee,
    hasPrincipalRange,
  ])

  // ------------------ Data processing ------------------
  // Filtered data
  const filteredData = useMemo(() => {
    if (!rows || rows.length === 0) return []

    return rows.filter(offer => {
      if (filters.showCollectionOffersOnly && !isCollectionOffer(offer)) {
        return false
      }

      if (filters.currency !== null && offer.terms.currency !== filters.currency) {
        return false
      }

      // TODO: if fxRate is not available, default to filtering withing one currency
      const principalAmount = convertWeiToUsd(offer.terms.currency, offer.terms.principal, fxRate ?? 3000)
      const [min, max] = filters.principalRange
      if (principalAmount < min || principalAmount > max) {
        return false
      }

      if (filters.isProRated !== null) {
        const matchesType = offer.terms.isProRated === filters.isProRated
        if (!matchesType) return false
      }

      if (offer.terms.apr > filters.maxApr) {
        return false
      }

      if (filters.withoutOriginationFee && offer.terms.origination > 0n) {
        return false
      }

      if (filters.activeLoansOnly && offer.status !== OfferStatus.Active) {
        return false
      }

      const durationInDays = Math.floor(Number(offer.terms.duration) / (24 * 60 * 60))
      if (filters.duration > 0 && durationInDays < filters.duration) {
        return false
      }

      if (filters.borrowerAddress) {
        if (offer.borrower !== filters.borrowerAddress) {
          return false
        }
      }

      if (filters.collections.length > 0) {
        const offerCollectionId = isAssetOffer(offer)
          ? offer.nft.collection.id
          : isCollectionOffer(offer)
            ? offer.collection.id
            : null
        if (!filters.collections.some(collection => collection.id === offerCollectionId)) {
          return false
        }
      }

      return true
    })
  }, [filters, rows, fxRate])

  // Sorted data
  const processedData = useMemo(() => {
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
        case 'repayment':
          aValue = fxRate
            ? convertWeiToUsd(a.terms.currency, a.terms.repayment, fxRate)
            : a.terms.repayment
          bValue = fxRate
            ? convertWeiToUsd(b.terms.currency, b.terms.repayment, fxRate)
            : b.terms.repayment
          break
        case 'offerType':
          aValue = getSortableValueByOfferType(a)
          bValue = getSortableValueByOfferType(b)
          break
        case 'loanType':
          aValue = getSortableValueByLoanType(a)
          bValue = getSortableValueByLoanType(b)
          break
        case 'apr':
          aValue = a.terms.apr
          bValue = b.terms.apr
          break
        case 'origination':
          aValue = fxRate
            ? convertWeiToUsd(a.terms.currency, a.terms.origination, fxRate)
            : a.terms.origination
          bValue = fxRate
            ? convertWeiToUsd(b.terms.currency, b.terms.origination, fxRate)
            : b.terms.origination
          break
        case 'effectiveApr':
          aValue = a.terms.effectiveApr
          bValue = b.terms.effectiveApr
          break
        case 'duration':
          aValue = a.terms.duration
          bValue = b.terms.duration
          break
        case 'expiry':
          aValue = a.expiry
          bValue = b.expiry
          break
        case 'offerStatus':
          aValue = getSortableValueByOfferStatus(a)
          bValue = getSortableValueByOfferStatus(b)
          break
        default:
          return 0
      }

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

      const comparison = (aValue as number) - (bValue as number)
      return sortOrder === SortOrder.ASC
        ? comparison
        : -comparison
    })

    return sorted
  }, [filteredData, sortingParams, fxRate])

  return {
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,

    // Sorting
    sortingParams,
    handleSortChange,

    // Filters
    filters,
    filtersDefaults: defaultFiltersWithPrincipalRange.current,
    updateFilter,
    resetAllFilters,
    filterStatus,

    // Processed data
    processedData,

    // View preferences
    density,
    setDensity,
    hiddenColumns,
    setHiddenColumns,
  }
}

function getSortableValueByOfferType(offer: ManageOffersTableRow) {
  if (isAssetOffer(offer)) {
    return 1
  }
  else if (isCollectionOffer(offer)) {
    return 2
  }
  else {
    return 3
  }
}

function getSortableValueByLoanType(offer: ManageOffersTableRow) {
  if (offer.terms.isProRated) {
    return 1
  }
  else {
    return 0
  }
}

function getSortableValueByOfferStatus(offer: ManageOffersTableRow) {
  let value = 0

  switch (offer.status) {
    case OfferStatus.Active:
      value = 1
      break
    case OfferStatus.Invalid:
      value = 2
      break
  }

  if (offer.isDeleted) {
    value -= 0.5
  }

  return value
}

function getDefaultFiltersWithPrincipalRange(rows: ManageOffersTableRow[], fxRate: number | null) {
  const principalBounds = (() => {
    if (rows.length === 0) {
      return {
        min: 0,
        max: 0,
      }
    }
    const { min, max } = getOffersMinMax('principal', rows, fxRate ?? 3000)

    return {
      min,
      max,
    }
  })()
  return {
    ...defaultFilters,
    principalRange: [principalBounds.min, principalBounds.max] as [number, number],
  }
}
