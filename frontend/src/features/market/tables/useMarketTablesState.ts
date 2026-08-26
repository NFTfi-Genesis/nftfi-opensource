import { useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TablePageSizes } from 'src/components/Tables/TableBase'
import { SortParams, SortOrder } from 'src/entities/app/SortParams'
import { PaginationParams } from 'src/entities/app/PaginationParams'

export enum MarketTables {
  Loans = 'loans',
  Borrowers = 'borrowers',
  Lenders = 'lenders',
}

export type MarketTableState<TTableSortField extends string = string> = SortParams<TTableSortField> & PaginationParams

export type MarketTableStateUpdate<TTableSortField extends string = string>
  = Partial<MarketTableState<TTableSortField>>

function getTableStateFromSearchParams<TTableSortField extends string = string>(
  searchParams: URLSearchParams,
  tableKey: string
): Partial<MarketTableState<TTableSortField>> {
  const sortByParam = searchParams.get(`${tableKey}SortBy`)
  const sortOrderParam = searchParams.get(`${tableKey}SortOrder`)
  const isValidSortOrderParam = Object.values(SortOrder).includes(
    sortOrderParam as SortOrder
  )

  const pageParam = searchParams.get(`${tableKey}Page`)
  const pageSizeParam = searchParams.get(`${tableKey}PageSize`)
  const isValidPageSizeParam = Object.keys(TablePageSizes).includes(
    pageSizeParam as keyof typeof TablePageSizes
  )

  return {
    sortBy: sortByParam
      ? (sortByParam as TTableSortField)
      : undefined,
    sortOrder:
      sortOrderParam && isValidSortOrderParam
        ? (sortOrderParam as SortOrder)
        : undefined,
    page: pageParam
      ? Number(pageParam)
      : undefined,
    pageSize:
      pageSizeParam && isValidPageSizeParam
        ? (Number(pageSizeParam) as unknown as TablePageSizes)
        : undefined,
  }
}

export function useMarketTableState<TTableSortField extends string = string>(
  tableKey: string,
  defaultSort: SortParams<TTableSortField>,
  defaultPagination: PaginationParams
) {
  const [searchParams, setSearchParams] = useSearchParams()

  const tableStateNormalizedWithDefaults = useMemo(() => {
    const initialState = getTableStateFromSearchParams<TTableSortField>(
      searchParams,
      tableKey
    )

    const stateNormalizedWithDefaults = { ...initialState }

    const shouldDefaultSortBy
      = defaultSort?.sortBy && !stateNormalizedWithDefaults.sortBy
    if (shouldDefaultSortBy) {
      stateNormalizedWithDefaults.sortBy = defaultSort.sortBy
    }

    const shouldDefaultSortOrder
      = stateNormalizedWithDefaults.sortBy
      && !stateNormalizedWithDefaults.sortOrder
      && defaultSort?.sortBy === stateNormalizedWithDefaults.sortBy
      && defaultSort.sortOrder
    if (shouldDefaultSortOrder) {
      stateNormalizedWithDefaults.sortOrder = defaultSort.sortOrder
    }

    const shouldDefaultPage
      = stateNormalizedWithDefaults.page === undefined
      && defaultPagination?.page !== undefined
    if (shouldDefaultPage) {
      stateNormalizedWithDefaults.page = defaultPagination.page
    }

    const shouldDefaultPageSize
      = stateNormalizedWithDefaults.pageSize === undefined
      && defaultPagination?.pageSize !== undefined
    if (shouldDefaultPageSize) {
      stateNormalizedWithDefaults.pageSize = defaultPagination.pageSize ?? 0
    }

    return stateNormalizedWithDefaults as MarketTableState<TTableSortField>
  }, [searchParams, tableKey, defaultSort, defaultPagination])

  useEffect(() => {
    // Impose default sort and pagination params
    let needsUpdate = false
    const newParams = new URLSearchParams(searchParams)

    if (defaultSort) {
      const sortByParam = `${tableKey}SortBy`
      const sortOrderParam = `${tableKey}SortOrder`
      const currentUrlSortByParam = searchParams.get(sortByParam)
      const currentUrlSortOrderParam = searchParams.get(sortOrderParam)

      const shouldDefaultSortBy
        = defaultSort.sortBy
        && !currentUrlSortByParam
        && tableStateNormalizedWithDefaults.sortBy === defaultSort.sortBy
      if (shouldDefaultSortBy) {
        newParams.set(sortByParam, defaultSort.sortBy as string)
        needsUpdate = true
      }

      const shouldDefaultSortOrder
        = defaultSort.sortOrder
        && !currentUrlSortOrderParam
        && tableStateNormalizedWithDefaults.sortOrder === defaultSort.sortOrder
      if (shouldDefaultSortOrder) {
        newParams.set(
          sortOrderParam,
          defaultSort.sortOrder as SortOrder
        )
        needsUpdate = true
      }
    }

    if (defaultPagination) {
      const pageParam = `${tableKey}Page`
      const pageSizeParam = `${tableKey}PageSize`
      const currentUrlPage = searchParams.get(pageParam)
      const currentUrlPageSize = searchParams.get(pageSizeParam)

      const shouldDefaultPage
        = defaultPagination.page !== undefined
        && !currentUrlPage
        && tableStateNormalizedWithDefaults.page === defaultPagination.page
      if (shouldDefaultPage) {
        newParams.set(pageParam, String(defaultPagination.page))
        needsUpdate = true
      }

      const shouldDefaultPageSize
        = defaultPagination.pageSize !== undefined
        && !currentUrlPageSize
        && tableStateNormalizedWithDefaults.pageSize === defaultPagination.pageSize
      if (shouldDefaultPageSize) {
        newParams.set(pageSizeParam, String(defaultPagination.pageSize))
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      setSearchParams(newParams, { replace: true })
    }
  }, [
    searchParams,
    setSearchParams,
    tableKey,
    defaultSort,
    defaultPagination,
    tableStateNormalizedWithDefaults.sortBy,
    tableStateNormalizedWithDefaults.sortOrder,
    tableStateNormalizedWithDefaults.page,
    tableStateNormalizedWithDefaults.pageSize,
  ])

  const handleChangeTableStateParams = useCallback(
    (paramsToUpdate: MarketTableStateUpdate<TTableSortField>) => {
      setSearchParams(prev => {
        const currentParams = new URLSearchParams(prev)
        let shouldResetPage = false

        const paramKeysToUpdate = Object.keys(paramsToUpdate) as Array<
          keyof MarketTableState<TTableSortField>
        >

        paramKeysToUpdate.forEach(paramKey => {
          const paramValue = paramsToUpdate[paramKey]
          // Construct URL param name, e.g. 'lendersSortBy' from tableKey 'lenders' and paramKey 'sortBy'
          const urlParamName = `${tableKey}${paramKey.charAt(0).toUpperCase() + paramKey.slice(1)}`

          const isSortingChanged
            = paramKey === 'sortBy' || paramKey === 'sortOrder'
          if (isSortingChanged) {
            shouldResetPage = true
          }

          const isInvalidPageOrPageSizeValue
            = (paramKey === 'page' || paramKey === 'pageSize')
            && (typeof paramValue !== 'number' || isNaN(paramValue as number))
          const isParamValueMissing
            = paramValue === undefined || paramValue === null

          if (isParamValueMissing || isInvalidPageOrPageSizeValue) {
            currentParams.delete(urlParamName)
          } else {
            currentParams.set(urlParamName, String(paramValue))
          }
        })

        if (shouldResetPage) {
          currentParams.set(`${tableKey}Page`, '0')
        }
        return currentParams
      })
    },
    [setSearchParams, tableKey]
  )

  const resetPageParam = useCallback(
    (existingParams: URLSearchParams): URLSearchParams => {
      const newParams = new URLSearchParams(existingParams)
      newParams.set(`${tableKey}Page`, '0')
      return newParams
    },
    [tableKey]
  )

  const handleSortChange = useCallback(
    (columnName: TTableSortField) => {
      if (tableStateNormalizedWithDefaults.sortBy === columnName) {
        handleChangeTableStateParams({
          sortBy: columnName,
          sortOrder:
            tableStateNormalizedWithDefaults.sortOrder
            === SortOrder.ASC
              ? SortOrder.DESC
              : SortOrder.ASC,
        })
      } else {
        handleChangeTableStateParams({
          sortBy: columnName,
          sortOrder: SortOrder.ASC,
        })
      }
    },
    [
      tableStateNormalizedWithDefaults.sortBy,
      tableStateNormalizedWithDefaults.sortOrder,
      handleChangeTableStateParams,
    ]
  )

  return {
    tableState: tableStateNormalizedWithDefaults,
    handleChangeTableStateParams,
    resetPageParam,
    handleSortChange,
  }
}
