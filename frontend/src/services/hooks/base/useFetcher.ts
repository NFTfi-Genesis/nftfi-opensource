import { useMemo } from 'react'
import useSWR, { SWRConfiguration } from 'swr'
import { DataKey } from 'src/services/keys/types'
import { Seconds } from 'src/entities/base/Seconds'
import { createErrorHandler, ErrorHandler, silentErrorHandler } from 'src/utils/errors'

// TODO: maybe rename isUpdating -> isFetching, isRefreshing -> isRefetching
export type UseFetcherResult<TResult> = {
  data: TResult | null

  error: Error | null
  // isLoading includes only the initial loading state for a key, not the reloading state (i.e. when the key is not invalidated)
  isLoading: boolean
  // isUpdating includes both the initial loading state and the reloading state
  isUpdating: boolean
  // isRefreshing includes only the reloading state
  isRefreshing: boolean

  refresh: () => void
}

export type UseFetcherOptions = {
  pollInterval?: Seconds
  cacheExpiration?: Seconds
  errorRetryInterval?: Seconds
  errorRetryCount?: number
  shouldRetryOnError?: boolean
  revalidateOnFocus?: boolean
  revalidateOnMount?: boolean
  onError?: ErrorHandler
  shouldExecute?: boolean
}

const defaultOptions: UseFetcherOptions = {
  pollInterval: 0 as Seconds,
  cacheExpiration: 2 as Seconds,
  errorRetryInterval: 5 as Seconds,
  errorRetryCount: 3,
  shouldRetryOnError: true,
  revalidateOnFocus: false,
  shouldExecute: true,
  revalidateOnMount: true,
}

function convertUseFetcherOptionsToSWRConfiguration(options: UseFetcherOptions): SWRConfiguration {
  const swrConfig = {
    refreshInterval: options?.pollInterval
      ? options?.pollInterval * 1000
      : 0,
    dedupingInterval: options?.cacheExpiration
      ? options?.cacheExpiration * 1000
      : 0,
    errorRetryInterval: options?.errorRetryInterval
      ? options?.errorRetryInterval * 1000
      : 0,
    errorRetryCount: options?.errorRetryCount,
    shouldRetryOnError: options?.shouldRetryOnError,
    revalidateOnFocus: options?.revalidateOnFocus,
    revalidateOnMount: options?.revalidateOnMount,
    onError: options?.onError
      ? createErrorHandler(options.onError)
      : undefined,
  } satisfies SWRConfiguration

  return swrConfig
}

export function useFetcher<TResult>(
  key: DataKey,
  fetcher: () => Promise<TResult>,
  options?: UseFetcherOptions
): UseFetcherResult<TResult> {
  const { data, error, isLoading, isValidating, mutate } = useSWR<TResult>(
    options?.shouldExecute === false
      ? null
      : key,
    fetcher,
    convertUseFetcherOptionsToSWRConfiguration({
      onError: options?.onError ?? silentErrorHandler,
      ...defaultOptions,
      ...options,
    })
  )

  return useMemo(() => ({
    data: data ?? null,
    error,
    isLoading,
    isUpdating: isLoading || isValidating,
    isRefreshing: isValidating && !isLoading,
    refresh: mutate,
  }), [data, error, isLoading, isValidating, mutate])
}
