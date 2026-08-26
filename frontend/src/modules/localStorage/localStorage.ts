const localStorageListeners = new Map<string, Array<() => void>>()

const bufferStorage = new Map<string, string | null>()
const bufferTimeouts = new Map<string, NodeJS.Timeout>()

export const subscribeToLocalStorage = (key: string, callback: () => void) => {
  const listeners = localStorageListeners.get(key) ?? []
  listeners.push(callback)
  localStorageListeners.set(key, listeners)
}

export function unsubscribeFromLocalStorage(key: string, callback: () => void) {
  localStorageListeners.set(key, localStorageListeners.get(key)?.filter(cb => cb !== callback) ?? [])
}

export const notifyLocalStorageListeners = (key: string) => {
  const listeners = localStorageListeners.get(key)
  if (listeners) {
    listeners.forEach(listener => listener())
  }
}

export const updateLocalStorage = (key: string, value: string | null, bufferTime: number = 0) => {
  bufferStorage.set(key, value)
  clearTimeout(bufferTimeouts.get(key))
  bufferTimeouts.set(key, setTimeout(() => {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
    bufferStorage.delete(key)
    bufferTimeouts.delete(key)
  }, bufferTime))
  notifyLocalStorageListeners(key)
}

export const getLocalStorageValue = (key: string) => {
  if (bufferStorage.has(key)) {
    return bufferStorage.get(key) as string | null
  }
  return localStorage.getItem(key)
}

export const installLocalStorageCrossSync = () => {
  // Storage event is emitted automatically when LS is updated in another tab or window
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key && event.newValue !== null) {
      updateLocalStorage(event.key, event.newValue, 0)
    }
  })
}
