import { useContext } from 'react'

import { ContextUsageError } from 'src/errors/ContextUsageError'
import { AuthContext } from './AuthProvider'

export function useAuth() {
  const authContext = useContext(AuthContext)
  if (!authContext) {
    throw new ContextUsageError({ message: 'useAuth must be used within a AuthProvider' })
  }

  return authContext
}
