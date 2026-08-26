import { createContext, ReactNode, useCallback, useRef } from 'react'
import { Mutex } from 'async-mutex'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { AuthError } from 'src/errors/AuthError'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuthorize } from 'src/services/hooks/auth/useAuthorize'
import { useRefreshAuthToken } from 'src/services/hooks/auth/useRefreshAuthToken'
import { validateJwtToken } from 'src/utils/jwt'
import { silentErrorHandler } from 'src/utils/errors'
import { AuthMode } from 'src/services/types/AuthMode'
import { PanicError } from 'src/errors/PanicError'

export const AuthContext = createContext<{
  isAuthenticated: boolean
  getToken: () => string | null
  getRefreshToken: () => string | null

  authorize: () => Promise<void>
  isAuthorizing: boolean
  authorizeError: Error | null

  refreshAuthToken: () => Promise<void>
  isRefreshingAuthToken: boolean
  refreshAuthTokenError: Error | null

  ensureAuthToken: (authMode: AuthMode) => Promise<string | null>

  unauthorize: () => void
} | null>(null)

// Handles authentication with the NFTFi API
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { walletAddress } = useWallet()
  const { send: sendAuthorize, isMutating: isAuthorizing, error: authorizeError } = useAuthorize()
  const { send: sendRefreshAuthToken, isMutating: isRefreshingAuthToken, error: refreshAuthTokenError } = useRefreshAuthToken({
    onError: silentErrorHandler
  })

  const [ , setToken, getToken ] = useLocalStorage(LocalStorageKeys.Auth.Token(walletAddress))
  const [ refreshToken, setRefreshToken, getRefreshToken ] = useLocalStorage(LocalStorageKeys.Auth.RefreshToken(walletAddress))

  const refreshMutex = useRef(new Mutex())

  // ----------------------------- isAuthenticated -----------------------------
  const isAuthenticated = Boolean(refreshToken)

  // ----------------------------- refreshAuthToken -----------------------------
  /*
   * Refreshes the auth token when refresh token is present
   */
  const refreshAuthToken = useCallback(async () => {
    // Use a mutext to prevent multiple requests with same refresh token
    // Which will result in failed refresh token request
    const release = await refreshMutex.current.acquire()
    try {
      const token = getToken()
      if (token && validateJwtToken(token)) {
        return
      }

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new AuthError({ message: 'No refresh token found' })
      }
      const result = await sendRefreshAuthToken(refreshToken)
      if (result.success) {
        const { token: newToken, refreshToken: newRefreshToken } = result.result
        setToken(newToken)
        setRefreshToken(newRefreshToken)
      }
    } finally {
      release()
    }
  }, [getRefreshToken, getToken, setToken, setRefreshToken, sendRefreshAuthToken])

  // ----------------------------- unauthorize -----------------------------
  /*
   * This function triggers components to rerender to unauthenticated state
   */
  const unauthorize = useCallback(() => {
    setToken(null)
    setRefreshToken(null)
  }, [setToken, setRefreshToken])

  // ----------------------------- ensureAuthToken -----------------------------
  const ensureAuthToken = useCallback(async (authMode: AuthMode) => {
    // -------------------- Any AuthMode --------------------
    if (authMode === AuthMode.None) {
      return null
    }

    // ------------- AuthMode.Optional/Required -------------
    let token = getToken()
    if (token && validateJwtToken(token)) {
      return token
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      if (authMode === AuthMode.Optional) {
        return null
      }
      unauthorize()
      throw new AuthError({ message: 'No refresh token found' })
    }

    // ------------- Refresh auth token ------------------
    try {
      await refreshAuthToken()
    } catch {
      if (authMode === AuthMode.Optional) {
        return null
      }
      unauthorize()
      throw new AuthError({ message: 'Failed to refresh auth token' })
    }

    // ------------- Retrieve refreshed auth token -------
    token = getToken()
    if (!token) {
      unauthorize()
      throw new PanicError({ message: 'No auth token found after successful refresh token attempt' })
    }

    return token
  }, [getToken, getRefreshToken, refreshAuthToken, unauthorize])

  // ----------------------------- authorize -----------------------------
  /*
   * Should never be called automatically, only on user action.
   * The accounts service upserts the account row during authenticate,
   * so no separate ensure-account step is needed here.
   */
  const authorize = useCallback(async () => {
    const result = await sendAuthorize()
    if (result.success) {
      const { token: newToken, refreshToken: newRefreshToken } = result.result
      setToken(newToken)
      setRefreshToken(newRefreshToken)
    }
  }, [sendAuthorize, setToken, setRefreshToken])

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      getToken,
      getRefreshToken,

      authorize,
      isAuthorizing,
      authorizeError,

      refreshAuthToken,
      isRefreshingAuthToken,
      refreshAuthTokenError,

      ensureAuthToken,

      unauthorize,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
