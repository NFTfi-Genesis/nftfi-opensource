import Cookies from 'js-cookie'

const CONSENT_COOKIE_NAME = 'nftfi_consent'

export function checkGdprConsent(): boolean | null {
  const consent = Cookies.get(CONSENT_COOKIE_NAME)

  if (consent === undefined) {
    return null
  }

  return consent === 'true'
}

export function setGdprConsent(consent: boolean): void {
  Cookies.set(CONSENT_COOKIE_NAME, consent.toString(), {
    expires: 365,
    path: '/',
  })
}
