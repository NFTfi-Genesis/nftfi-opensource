import { assertType } from 'src/typesUtils'
import { LocalStorageKeyWithoutSettings } from 'src/modules/localStorage/types'
import { LocalStorageValues } from 'src/modules/localStorage/config'

// Type-level check: For each key in LocalStorageKey, ensure LocalStorageValues has a value type for it
type _CheckLocalStorageValues = {
  [K in LocalStorageKeyWithoutSettings]: K extends keyof LocalStorageValues
    ? LocalStorageValues[K]
    : never
}
// Type-level check: If any value in _CheckLocalStorageValues is 'never', trigger a type error
type _CheckNoNever<T> = {
  [K in keyof T]: T[K] extends never ? K : never
}[keyof T]

type _AssertNoNever = _CheckNoNever<_CheckLocalStorageValues> extends never
  ? true
  : 'Error: Some LocalStorageKey is missing a value in LocalStorageValues'
assertType<_AssertNoNever>(true)
