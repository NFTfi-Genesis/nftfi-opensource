import Cookies from 'js-cookie'

const LEGAL_AND_RISK_DISCLAIMER_CONSENT_COOKIE_NAME = 'nftfi_legal_and_risk_disclaimer_consent'

export function checkLegalAndRiskDisclaimerConsent(): boolean | null {
  const consent = Cookies.get(LEGAL_AND_RISK_DISCLAIMER_CONSENT_COOKIE_NAME)

  if (consent === undefined) {
    return null
  }

  return consent === 'true'
}

export function setLegalAndRiskDisclaimerConsent(consent: boolean): void {
  Cookies.set(LEGAL_AND_RISK_DISCLAIMER_CONSENT_COOKIE_NAME, consent.toString(), {
    expires: 365, // expires in 1 year
    path: '/',
  })
}
