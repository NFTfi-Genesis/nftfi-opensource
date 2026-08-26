import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react'

import { ContextUsageError } from 'src/errors/ContextUsageError'

export type CheckState = 'current' | 'next' | 'done' | 'already-done'
type BaseCheckState = 'loading' | 'incomplete' | 'done' | 'already-done'

type CheckEntry = {
  state: BaseCheckState
  order: number
  label: string
  name?: string
  optional?: boolean
}

type ChecksContextValue = {
  registerCheck: (id: string, state: BaseCheckState, label: string, name?: string, optional?: boolean) => void
  unregisterCheck: (id: string) => void
  getDisplayState: (id: string) => CheckState
  areAllChecksPassed: boolean
  areAllChecksAlreadyDone: boolean
  shouldHideChecks: boolean
  getIncompleteCheckLabels: () => string[]
}

const ChecksContext = createContext<ChecksContextValue | null>(null)

export function ChecksProvider({ children }: { children: ReactNode }) {
  const orderCounter = useRef(0)
  const [checks, setChecks] = useState<Record<string, CheckEntry>>({})

  const registerCheck = useCallback((id: string, state: BaseCheckState, label: string, name?: string, optional?: boolean) => {
    setChecks(prev => {
      if (id in prev) {
        return { ...prev, [id]: { ...prev[id], state, label, name: name ?? prev[id].name, optional } }
      }
      return { ...prev, [id]: { state, order: orderCounter.current++, label, name, optional } }
    })
  }, [])

  const unregisterCheck = useCallback((id: string) => {
    setChecks(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const firstIncompleteId = useMemo(() => {
    const sortedEntries = Object.entries(checks).sort(([, a], [, b]) => a.order - b.order)
    for (const [id, entry] of sortedEntries) {
      if (entry.state === 'incomplete') {
        return id
      }
    }
    return null
  }, [checks])

  const getDisplayState = useCallback(
    (id: string): CheckState => {
      const entry = checks[id]
      if (!entry) return 'next'
      if (entry.state === 'done' || entry.state === 'already-done') return entry.state
      return id === firstIncompleteId
        ? 'current'
        : 'next'
    },
    [checks, firstIncompleteId]
  )

  const areAllChecksPassed = useMemo(() => {
    const entries = Object.values(checks)
    if (entries.length === 0) return false
    return entries.every(entry => entry.state === 'done' || entry.state === 'already-done' || entry.optional)
  }, [checks])

  const areAllChecksAlreadyDone = useMemo(() => {
    const entries = Object.values(checks)
    if (entries.length === 0) return false

    const alreadyDoneCount = entries.filter(entry => entry.state === 'already-done').length
    const doneEntries = entries.filter(entry => entry.state === 'done')

    if (alreadyDoneCount === entries.length) {
      return true
    }

    if (alreadyDoneCount === entries.length - 1 && doneEntries.length === 1) {
      return doneEntries[0].name === 'balance'
    }

    return false
  }, [checks])

  const shouldHideChecks = useMemo(() => {
    const entries = Object.values(checks)
    // some entries ARE not loading AND (not already done OR ((done or already done) BUT name is balance))
    return !entries.some(entry => {
      if (entry.state === 'loading') return false
      if ((entry.state === 'done' || entry.state === 'already-done') && entry.name === 'balance') return false
      if (entry.state !== 'already-done') return true
      return entry.name === 'balance'
    })
  }, [checks])

  const getIncompleteCheckLabels = useCallback((): string[] => {
    const entries = Object.entries(checks)
      .map(([id, entry]) => ({ id, ...entry }))
      .filter(entry => entry.state === 'incomplete' && !entry.optional)
      .sort((a, b) => a.order - b.order)

    return entries.map(entry => entry.label)
  }, [checks])

  const contextValue = useMemo(
    () => ({ registerCheck, unregisterCheck, getDisplayState, areAllChecksPassed, areAllChecksAlreadyDone, shouldHideChecks, getIncompleteCheckLabels }),
    [registerCheck, unregisterCheck, getDisplayState, areAllChecksPassed, areAllChecksAlreadyDone, shouldHideChecks, getIncompleteCheckLabels]
  )

  return <ChecksContext.Provider value={contextValue}>{children}</ChecksContext.Provider>
}

export function useChecks() {
  const context = useContext(ChecksContext)
  if (!context) {
    throw new ContextUsageError({
      message: 'useChecks must be used within ChecksProvider',
    })
  }
  return context
}
