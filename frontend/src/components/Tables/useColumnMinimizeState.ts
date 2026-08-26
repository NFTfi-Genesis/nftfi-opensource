import { type RefObject, useEffect, useState, useRef } from 'react'
import { useDebounce } from 'src/hooks/useDebounce'

/**
 * Hook to determine if a table column should be minimized based on scroll state
 * Designed to be used once per table (not per cell/row) for performance
 */
export function useColumnMinimizeState(tableContainerRef: RefObject<HTMLElement>) {
  const [shouldMinimize, setShouldMinimize] = useState(false)
  const debouncedSetShouldMinimize = useDebounce(setShouldMinimize, 50)
  const previousMinimizeRef = useRef(false)
  const isTransitioningRef = useRef(false)

  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const scrollContainer = container.querySelector('.MuiDataGrid-virtualScroller')
    if (!scrollContainer) return

    const checkMinimizeState = () => {
      // Skip measurement during transitions to prevent flickering
      if (isTransitioningRef.current) {
        return
      }

      // Check scroll position to determine if we need to minimize
      const scrollLeft = scrollContainer.scrollLeft
      const scrollWidth = scrollContainer.scrollWidth
      const clientWidth = scrollContainer.clientWidth

      // Calculate if we're at the end (with tolerance)
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 90

      // Check if horizontal scrolling is needed (content wider than viewport)
      const needsHorizontalScroll = scrollWidth > clientWidth + 5

      // Determine if column should be minimized based on scroll position
      // Minimized = horizontal scroll is needed AND not at the end
      // Normal = no scroll needed OR at the end
      let minimize: boolean
      if (!needsHorizontalScroll) {
        // Content fits in viewport, no need to minimize
        minimize = false
      } else if (isAtEnd) {
        // At the end, show normal (fully expanded)
        minimize = false
      } else {
        // Scrolling needed and not at end, minimize to save space
        minimize = true
      }

      if (minimize !== previousMinimizeRef.current) {
        previousMinimizeRef.current = minimize

        // Lock transitions and defer state update
        isTransitioningRef.current = true
        debouncedSetShouldMinimize(minimize)

        // Unlock after transition completes (CSS transition + buffer)
        setTimeout(() => {
          isTransitioningRef.current = false
        }, 300)
      }
    }

    // Check on scroll
    scrollContainer.addEventListener('scroll', checkMinimizeState, { passive: true })
    window.addEventListener('resize', checkMinimizeState, { passive: true })

    // Observe container size changes (e.g., when table resizes due to split view)
    const resizeObserver = new ResizeObserver(() => {
      checkMinimizeState()
    })
    resizeObserver.observe(scrollContainer)

    return () => {
      scrollContainer.removeEventListener('scroll', checkMinimizeState)
      window.removeEventListener('resize', checkMinimizeState)
      resizeObserver.disconnect()
    }
  }, [tableContainerRef, debouncedSetShouldMinimize])

  return shouldMinimize
}
