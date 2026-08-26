import { useCallback, useMemo } from 'react'
import { UseFetcherResult } from 'src/services/hooks/base/useFetcher'

type CombinedData<T extends Record<string, UseFetcherResult<unknown>>> = {
  [K in keyof T]: T[K]['data']
}
export type ComposeFetchersReducer<T extends Record<string, UseFetcherResult<unknown>>, R>
  = (data: CombinedData<T>) => R

export type UseComposeFetchersParams<TResponsesMap extends Record<string, UseFetcherResult<unknown>>, TReduced> = {
  responses: TResponsesMap
  reducer?: ComposeFetchersReducer<TResponsesMap, TReduced>
}

export function useComposeFetchers<TResponsesMap extends Record<string, UseFetcherResult<unknown>>>(
  { responses }: UseComposeFetchersParams<TResponsesMap, CombinedData<TResponsesMap>>
): UseFetcherResult<CombinedData<TResponsesMap>>

export function useComposeFetchers<TResponsesMap extends Record<string, UseFetcherResult<unknown>>, TReduced>(
  { responses, reducer }: UseComposeFetchersParams<TResponsesMap, TReduced>
): UseFetcherResult<TReduced>

// Implementation
export function useComposeFetchers<TResponsesMap extends Record<string, UseFetcherResult<unknown>>, TReduced>(
  { responses, reducer }: UseComposeFetchersParams<TResponsesMap, TReduced>
): UseFetcherResult<TReduced | CombinedData<TResponsesMap>> {
  const entries = useMemo(
    () => Object.entries(responses) as [keyof TResponsesMap, UseFetcherResult<unknown>][],
    [responses]
  )

  const combined = useMemo(() => {
    const out = {} as CombinedData<TResponsesMap>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [k, r] of entries) (out as any)[k] = r.data
    return out
  }, [entries])

  const isLoading = useMemo(
    () => entries.some(([, r]) => r.isLoading),
    [entries]
  )

  const isUpdating = useMemo(
    () => entries.some(([, r]) => r.isUpdating),
    [entries]
  )

  const isRefreshing = useMemo(
    () => entries.some(([, r]) => r.isRefreshing),
    [entries]
  )

  const error = useMemo<Error | null>(() => {
    for (const [, r] of entries) if (r.error) return r.error
    return null
  }, [entries])

  const refresh = useCallback(() => {
    for (const [, r] of entries) r.refresh()
  }, [entries])

  const data = useMemo(
    () => (reducer
      ? reducer(combined)
      : combined),
    [combined, reducer]
  )

  return { data, isLoading, isUpdating, isRefreshing, error, refresh }
}
