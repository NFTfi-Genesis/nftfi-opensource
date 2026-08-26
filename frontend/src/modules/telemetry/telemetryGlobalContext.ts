import { Address } from 'src/entities/base/Address'
import { Seconds } from 'src/entities/base/Seconds'
import { getLocalStorageValue } from 'src/modules/localStorage/localStorage'
import { getJwtTokenExpiry } from 'src/utils/jwt'
import { LocalStorageKeys } from '../localStorage/config'

type TelemetryGlobalContext = {
  walletAddress: Address | null
  walletUsed: string | null
  sessionStartTime: number
}

export const telemetryGlobalContext: TelemetryGlobalContext = {
  walletAddress: null,
  walletUsed: null,
  sessionStartTime: Date.now() as Seconds,
}

export type TelemetryGlobalContextSnapshot = {
  walletAddress: Address | null
  walletUsed: string | null
  hostname: string
  location: string
  sessionDuration: Seconds
  hasAuthToken: boolean
  hasPhysicalAuthToken: boolean
  hasRefreshToken: boolean
  hasPhysicalRefreshToken: boolean
  authTokenAndPhysicalAuthTokenMatch: boolean
  refreshTokenAndPhysicalRefreshTokenMatch: boolean
  authTokenExpiry: number | null
  physicalAuthTokenExpiry: number | null
}

export function takeTelemetrySnapshot(): TelemetryGlobalContextSnapshot {
  const authToken = getLocalStorageValue(LocalStorageKeys.Auth.Token(telemetryGlobalContext.walletAddress).key)
  const physicalAuthToken = localStorage.getItem(LocalStorageKeys.Auth.Token(telemetryGlobalContext.walletAddress).key)
  const refreshToken = getLocalStorageValue(LocalStorageKeys.Auth.RefreshToken(telemetryGlobalContext.walletAddress).key)
  const physicalRefreshToken = localStorage.getItem(LocalStorageKeys.Auth.RefreshToken(telemetryGlobalContext.walletAddress).key)

  return {
    walletAddress: telemetryGlobalContext.walletAddress,
    walletUsed: telemetryGlobalContext.walletUsed,
    hostname: window.location.hostname,
    location: window.location.pathname,
    sessionDuration: getSessionDuration(telemetryGlobalContext.sessionStartTime),

    // Tokens insights
    hasAuthToken: telemetryGlobalContext.walletAddress
      ? authToken !== null
      : false,
    hasPhysicalAuthToken: telemetryGlobalContext.walletAddress
      ? physicalAuthToken !== null
      : false,
    hasRefreshToken: telemetryGlobalContext.walletAddress
      ? refreshToken !== null
      : false,
    hasPhysicalRefreshToken: telemetryGlobalContext.walletAddress
      ? physicalRefreshToken !== null
      : false,
    authTokenAndPhysicalAuthTokenMatch: authToken === physicalAuthToken,
    refreshTokenAndPhysicalRefreshTokenMatch: refreshToken === physicalRefreshToken,
    authTokenExpiry: telemetryGlobalContext.walletAddress && authToken
      ? getJwtTokenExpiry(authToken)
      : null,
    physicalAuthTokenExpiry: telemetryGlobalContext.walletAddress && physicalAuthToken
      ? getJwtTokenExpiry(physicalAuthToken)
      : null,
  }
}

function getSessionDuration(sessionStartTime: number): Seconds {
  return (Date.now() - sessionStartTime) / 1000 as Seconds
}
