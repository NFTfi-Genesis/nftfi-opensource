import type { BaseError } from 'src/errors/BaseError'

//  ---------------- Branded types ----------------

declare const __brand__: unique symbol
export type Branded<T, Brand extends string> = T & { readonly [__brand__]: Brand }
export type BrandedNonStrict<T, Brand extends string> = T | { readonly [__brand__]: Brand }

//  --------------------------------------------

//  ---------------- Entity Extension helpers ----------------
/**
 * Extend the entity type with the field of the given extension type.
 * Exts - the union of all the extension types
 * Candidate - the type of the field to extend
 * PropName - the name of the field to containt the extension type
 * Options
 * - Required: whether the field is required (default: true)
 */
export type ExtendWithProp<
  Exts,
  Candidate,
  PropName extends string,
  Options extends { Required?: boolean } = { Required: true }
>
  = Extract<Exts, Candidate> extends never
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ? {}
    : Options['Required'] extends true
      ? { [P in PropName]: Extract<Exts, Candidate> }
      : { [P in PropName]?: Extract<Exts, Candidate> }

/**
 * Extend the entity type with the fields of the given extension type (merge).
 * Exts - the union of all the extension types
 * Props - the extension type to merge
 */
export type ExtendWithProps<
  Exts,
  Props extends Record<string, unknown>
>
  = Extract<Exts, Props> extends never
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ? {}
    : Props

//  --------------------------------------------

//  ---------------- JSON types ----------------

export type JSONPrimitive = string | number | boolean | null | undefined
export interface JSONObject {
  [key: string]: JSONValue
}
export type JSONArray = Array<JSONValue>
export type JSONValue = JSONPrimitive | JSONObject | JSONArray

//  --------------------------------------------

//  ---------------- Other type utils ----------------

/**
 * Overwrites properties of T with properties of R
 */
export type Overwrite<T, R> = Omit<T, keyof R> & R

/**
 * Result wrapper
 */
export type Result<T> = {
  success: true
  result: T
} | {
  success: false
  error: BaseError
}

/**
 * Makes a field required in a type
 *
 * @example
 * type T = {
 *   a?: string
 *   b?: string
 * }
 * type K = RequireField<T, 'a'> // { a: string, b?: string }
 */
export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * The most generic function type
 */
export type BaseFunction = (...args: never[]) => unknown

/**
 * Makes all properties in T optional recursively
 * This is useful for deeply nested option objects where we want to allow partial overrides at any level
 */
export type PartialRecursive<T> = {
  [P in keyof T]?: T[P] extends object ? PartialRecursive<T[P]> : T[P]
}

/**
 * Throws TS error if obj is not of the type T
 */
export function assertType<T>(obj: T): T {
  // no-op
  return obj
}

/** Dot-path union of all leaf keys in an object
 *
 * @example
 * type T = {
 *   a: {
 *     b: {
 *       c: string
 *     }
 *   }
 * }
 * type K = KeyPaths<T> // 'a.b.c'
 */
export type KeyPaths<T>
  = T extends object
    ? {
      [K in keyof T & string]:
      T[K] extends object
        ? `${K}.${KeyPaths<T[K]>}`
        : K
    }[keyof T & string]
    : never
