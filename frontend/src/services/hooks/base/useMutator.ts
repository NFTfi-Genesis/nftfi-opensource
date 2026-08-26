import { useCallback, useMemo, useRef } from 'react'
import { mutate } from 'swr'
import useSWRMutation, { SWRMutationConfiguration } from 'swr/mutation'
import { DataKey, DataKeyMatcher } from 'src/services/keys/types'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { createErrorHandler, notificationErrorHandler, ErrorHandler, recognizeError } from 'src/utils/errors'
import { Result } from 'src/typesUtils'

export type UseMutatorResult<TParams extends unknown[] | unknown, TResult> = {
  data: TResult | null
  error: Error | null
  send: TParams extends unknown[]
    ? (...params: TParams) => Promise<Result<TResult>>
    : (param: TParams) => Promise<Result<TResult>>
  isMutating: boolean
}

// TParams can be a single argument or multiple positional arguments.
// This type handles both cases.
export type UseMutatorParams<TParams extends unknown[] | unknown, TResult, TData> = {
  getKey: TParams extends unknown[]
    ? (...params: TParams) => DataKey
    : (param: TParams) => DataKey
  mutator: TParams extends unknown[]
    ? (...params: TParams) => Promise<TResult>
    : (param: TParams) => Promise<TResult>
  invalidateKeys?: TParams extends unknown[]
    ? (...params: TParams) => DataKeyMatcher
    : (param: TParams) => DataKeyMatcher
  getOptimisticData?: TParams extends unknown[]
    ? (...params: TParams) => (data: TData) => TData
    : (param: TParams) => (data: TData) => TData
}

export type UseMutatorOptions<TResult> = {
  /**
   * The function provided is required to be wrapped in useCallback to avoid infinite re-renders.
   */
  onError?: ErrorHandler
  /**
   * The function provided is required to be wrapped in useCallback to avoid infinite re-renders.
   */
  onSuccess?: (result: TResult) => void

  rollbackOnError?: boolean
  populateCache?: boolean
  revalidate?: boolean
}

const defaultOptions: UseMutatorOptions<unknown> = {
  rollbackOnError: true,
  populateCache: false,
  revalidate: true,
}

function convertUseMutatorOptionsToSWRMutationConfiguration(options: UseMutatorOptions<unknown>): SWRMutationConfiguration<unknown, Error, () => DataKey, unknown[]> {
  const swrMutationConfig = {
    onError: options?.onError
      ? createErrorHandler(options.onError)
      : undefined,
    onSuccess: options?.onSuccess,
    rollbackOnError: options?.rollbackOnError,
    populateCache: options?.populateCache,
    revalidate: options?.revalidate,
  } satisfies SWRMutationConfiguration<unknown, Error, () => DataKey, unknown[]>
  return swrMutationConfig
}

// ─── overload 1: many args / tuple ───────────────────────
export function useMutator<TParams extends unknown[], TResult, TData>(
  params: UseMutatorParams<TParams, TResult, TData>,
  options?: UseMutatorOptions<TResult>,
): UseMutatorResult<TParams, TResult>

// ─── overload 2: single arg ─────────────────────────────
export function useMutator<TParam, TResult, TData>(
  params: UseMutatorParams<TParam, TResult, TData>,
  options?: UseMutatorOptions<TResult>
): UseMutatorResult<[TParam], TResult>

/**
 * If mutator takes multiple arguments it's required to specify type for the arguments either in `getKey` or in `mutator`.
 * In this case it's optional to pass generic type arguments to `useMutator`.
 * @example
 * ```ts
 * // One mutator argument. Passing type arguments.
 * useMutator<bigint, Wei>(
 *   {
 *     getKey: (offerNonce) => DataKeys.offers(walletAddress),
 *     mutator: async (offerNonce) => await revokeOffer(offerNonce, { getSigner }),
 *   }
 * )
 * ```
 * @example
 * ```ts
 * // Multiple mutator arguments
 * useMutator(
 *   {
 *     getKey: (currency: NftfiCurrency, spender: Address) => DataKeys.allowance(currency, walletAddress, spender),
 *     mutator: async (currency, spender) => await setAllowanceMax(currency, spender, { getSigner }),
 *   }
 * )
 * ```
 */
export function useMutator(
  params: UseMutatorParams<unknown[], unknown, unknown>,
  options?: UseMutatorOptions<unknown>,
): UseMutatorResult<unknown[], unknown> {
  const { getKey, mutator, invalidateKeys, getOptimisticData } = params

  const keyRef = useRef<DataKey>(null)
  const { t } = useTranslation()
  const swrOptions = useMemo(() => convertUseMutatorOptionsToSWRMutationConfiguration({
    onError: options?.onError ?? notificationErrorHandler(t),
    ...defaultOptions,
    ...options,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [...Object.values(options ?? {}), t])

  const { data, error, trigger, isMutating } = useSWRMutation<
    unknown,
    Error,
    () => DataKey,
    unknown[]
  >(
    () => keyRef.current,
    (_: DataKey, { arg }: { arg: unknown[] }) => mutator(...arg),
    swrOptions,
  )

  const send = useCallback(async (...params: unknown[]): Promise<Result<unknown>> => {
    keyRef.current = getKey(...params)
    swrOptions.optimisticData = getOptimisticData?.(...params)
    let result: unknown
    try {
      result = await trigger(params, swrOptions)
    } catch (error) {
      return {
        success: false,
        error: recognizeError(error),
      }
    }
    if (invalidateKeys) {
      const keyMatcher = invalidateKeys(...params)
      if (Array.isArray(keyMatcher)) {
        keyMatcher.forEach(key => mutate(key))
      } else {
        mutate(keyMatcher)
      }
    }
    return {
      success: true,
      result,
    }
  }, [getKey, invalidateKeys, trigger, swrOptions, getOptimisticData])

  return {
    data: data ?? null,
    error: error ?? null,
    send,
    isMutating,
  }
}

// -------------------
// Another implementation of useMutator to consider if first doesn't work

// export function useMutator2(mutator: (data: any) => Promise<any>): {send: (key: DataKey, data: any) => Promise<any>} {
//   return {
//     send: async (key: DataKey, data: any) => {
//       const result = await mutator(data)
//       await mutate(key, data)
//       return result
//     },
//   }
// }
