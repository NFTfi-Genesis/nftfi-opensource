import { useRef, useId, useEffect } from 'react'
import { Box, Button } from '@mui/material'

import { Iconify } from 'src/components/Iconify'
import { useChecks } from './ChecksProvider'

export type CheckProps = {
  isConditionMet?: boolean // undefined = still loading
  text: string
  onClick?: () => void
  isLoading?: boolean
}

export function Check({ isConditionMet, text, onClick, isLoading = false }: CheckProps) {
  const { registerCheck, unregisterCheck, getDisplayState } = useChecks()
  const checkId = useId()

  const wasInitiallyMet = useRef<boolean | null>(null)
  if (wasInitiallyMet.current === null && isConditionMet !== undefined) {
    wasInitiallyMet.current = isConditionMet
  }

  useEffect(() => {
    const baseState = isLoading
      ? 'loading'
      : wasInitiallyMet.current
        ? 'already-done'
        : isConditionMet
          ? 'done'
          : 'incomplete'
    registerCheck(checkId, baseState, text)
    return () => unregisterCheck(checkId)
  }, [registerCheck, unregisterCheck, checkId, isConditionMet, text, isLoading])

  const state = getDisplayState(checkId)

  if (state === 'already-done' || isLoading !== false) {
    return null
  }

  const isCurrent = state === 'current'
  const isDone = state === 'done'

  return (
    <Box sx={{ position: 'relative', flex: 1, overflow: 'visible' }}>
      {isDone && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'common.white',
            zIndex: 1,
          }}
        >
          <Iconify
            icon='eva:checkmark-fill'
            width={12}
            sx={{ color: 'customPallette.nftfi.paper' }}
          />
        </Box>
      )}
      <Button
        onClick={onClick}
        disabled={isDone}
        fullWidth
        variant={isCurrent
          ? 'contained'
          : 'outlined'}
        sx={{
          height: 36,
          borderRadius: 1,
        }}
      >
        {text}
      </Button>
    </Box>
  )
}
