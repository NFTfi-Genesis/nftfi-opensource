import { useEffect, useRef } from 'react'

/**
 * A hook that logs the changes of a state to the console.
 * @param value - The value to log.
 * @param name - The name of the variable.
 * @param scope - The scope of the variable (for filtering in the browser console).
 * @example
 * useDebugStateUpdate(pageNumber, 'pageNumber', 'OffersTable')
 * useDebugStateUpdate(pageSize, 'pageSize', 'OffersTable')
 */
export const useDebugStateUpdate = <T>(value: T, name: string, scope = '') => {
  const prevValueRef = useRef<T>(value)

  useEffect(() => {
    if (prevValueRef.current !== value) {
      console.log(`${scope}: ${name} changed:`, {
        prev: prevValueRef.current,
        current: value
      })
      prevValueRef.current = value
    }
  }, [value, name, scope])
}
