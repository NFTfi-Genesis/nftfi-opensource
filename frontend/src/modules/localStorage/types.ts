import { BaseFunction } from 'src/typesUtils'
import { LocalStorageKeys } from 'src/modules/localStorage/config'

export type Settings<T = unknown> = {
  // Defined if to serialize the value to JSON or not
  serializeValue?: boolean
  // Default value for dynamic keys. For static keys default value should be defined in LocalStorageDefaults object.
  defaultValue?: T
  // Debounce time for update within the same tab. If not set, no debounce will be applied.
  bufferTime?: number
}

export type KeyWithSettings<T> = {
  key: T
  settings: Settings<T>
}

// -------------------- Utility types --------------------

type ExtractStringLiteralType<T> = T extends string ? T : never

type ExtractNestedKeyTypesWithSettings<T> = T extends BaseFunction
  ? ExtractNestedKeyTypesWithSettings<ReturnType<T>>
  : T extends object
    ? T extends KeyWithSettings<infer U>
      ? KeyWithSettings<U>
      : { [K in keyof T]: ExtractNestedKeyTypesWithSettings<T[K]> }[keyof T]
    : ExtractStringLiteralType<T>

type ExtractNestedKeyTypes<T> = T extends BaseFunction
  ? ExtractNestedKeyTypes<ReturnType<T>>
  : T extends object
    ? T extends KeyWithSettings<infer U>
      ? U
      : { [K in keyof T]: ExtractNestedKeyTypes<T[K]> }[keyof T]
    : ExtractStringLiteralType<T>

export type LocalStorageKey = ExtractNestedKeyTypesWithSettings<
  typeof LocalStorageKeys
>
export type LocalStorageKeyWithoutSettings = ExtractNestedKeyTypes<
  typeof LocalStorageKeys
>

export type ExtractedKey<T> = T extends KeyWithSettings<infer U> ? U : T

type ReturnTypeOrValueType<T> = T extends BaseFunction ? ReturnType<T> : T

export type GetKeyType<T> = ExtractedKey<ReturnTypeOrValueType<T>>
