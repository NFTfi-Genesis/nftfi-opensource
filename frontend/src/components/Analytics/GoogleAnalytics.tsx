import { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { config } from 'src/config/config'
import { useWallet } from 'src/modules/wallet/useWallet'
import { checkGdprConsent } from 'src/utils/gdpr'

export function GoogleAnalytics() {
  const hasConsent = !!checkGdprConsent()
  const { walletAddress } = useWallet()

  useEffect(() => {
    if (hasConsent && config.googleAnalyticsId) {
      // initialize GA4 if consent is given
      ReactGA.initialize(config.googleAnalyticsId)
    }
  }, [hasConsent])

  useEffect(() => {
    if (hasConsent && config.googleAnalyticsId && walletAddress) {
      // set user ID to wallet address if wallet is connected
      ReactGA.set({ userId: walletAddress })
    }
  }, [hasConsent, walletAddress])

  return null
}
