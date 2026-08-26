import { useCallback, useSyncExternalStore } from 'react'
import { PanicError } from 'src/errors/PanicError'
import { RequireField } from 'src/typesUtils'
import { jsonParseCached, jsonStringify } from 'src/utils/json'
import { LocalStorageDefaults, LocalStorageValues } from './config'
import { ExtractedKey, KeyWithSettings, Settings } from './types'
import { getLocalStorageValue, subscribeToLocalStorage, updateLocalStorage, unsubscribeFromLocalStorage } from './localStorage'

type UseLocalStorageResult<T> = [T, (value: T | ((prevState: T) => T)) => void, () => T]

type DefaultSettingsFields = 'serializeValue' | 'bufferTime'
const defaultSettings: RequireField<Settings, DefaultSettingsFields> = {
  serializeValue: true,
  bufferTime: 0,
} as const

export function useLocalStorage<K extends keyof LocalStorageValues>(
  storageKey: K | KeyWithSettings<K>,
): UseLocalStorageResult<LocalStorageValues[ExtractedKey<K>]> {
  const key = typeof storageKey === 'string'
    ? storageKey
    : storageKey.key
  const settings: RequireField<Settings, DefaultSettingsFields> = typeof storageKey === 'string'
    ? defaultSettings
    : { ...defaultSettings, ...storageKey.settings }

  const getValue = useCallback(() => {
    // Get the default value from the LocalStorageDefaults object or the settings object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultValue = (LocalStorageDefaults as any)[key] ?? settings.defaultValue ?? null
    const value = getLocalStorageValue(key)
    if (value === null) {
      return defaultValue
    }
    if (settings.serializeValue) {
      return jsonParseCached(value)
    }
    return value
  // Intentionally exclude settings from the deps array as they should not change during the component lifecycle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const setValue = useCallback((newValue: LocalStorageValues[ExtractedKey<K>] | ((prevState: LocalStorageValues[ExtractedKey<K>]) => LocalStorageValues[ExtractedKey<K>])) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = newValue
    if (typeof newValue === 'function') {
      value = newValue(getValue())
    }
    if (settings.serializeValue && value !== null) {
      value = jsonStringify(value)
    }
    if (typeof value !== 'string' && value !== null) {
      throw new PanicError({ message: 'Value passed to setValue is not a string or null and serializeValue is false' })
    }
    updateLocalStorage(key, value, settings.bufferTime)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, getValue])

  const subscribe = useCallback((callback: () => void) => {
    subscribeToLocalStorage(key, callback)
    return () => unsubscribeFromLocalStorage(key, callback)
  }, [key])

  const value = useSyncExternalStore(subscribe, getValue)

  return [value, setValue, getValue]
}
