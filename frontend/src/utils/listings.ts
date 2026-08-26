import { LoanTermsPreference } from 'src/entities/domain/Listing'
import { PanicError } from 'src/errors/PanicError'
import { WalletNftsStatusOptions } from 'src/features/nfts/walletNfts/types'
import { TFunction } from 'src/modules/translation/TFunction'

export function getLoanTermsPreferenceFromString(preference: string): LoanTermsPreference {
  if (preference === 'highAmount') {
    return LoanTermsPreference.HighAmount
  }
  else if (preference === 'lowApr') {
    return LoanTermsPreference.LowApr
  }
  else {
    throw new PanicError({ message: `Invalid loan terms preference: ${preference}` })
  }
}

export function loanTermsPreferenceToString(preference: LoanTermsPreference): string {
  if (preference === LoanTermsPreference.HighAmount) {
    return 'highAmount'
  }
  else if (preference === LoanTermsPreference.LowApr) {
    return 'lowApr'
  } else {
    throw new PanicError({ message: `Invalid loan terms preference: ${preference}` })
  }
}

export function getListingPreferenceOptionsDisplayText(preference: LoanTermsPreference, t: TFunction): string {
  switch (preference) {
    case LoanTermsPreference.HighAmount:
      return t('borrow.higher-amount')
    case LoanTermsPreference.LowApr:
      return t('borrow.lower-interest')
  }
}

export function getWalletNftsStatusDisplayText(status: WalletNftsStatusOptions, t: TFunction): string {
  switch (status) {
    case WalletNftsStatusOptions.Any:
      return t('filters.any')
    case WalletNftsStatusOptions.Listed:
      return t('custom-table-columns.listed')
    case WalletNftsStatusOptions.Unlisted:
      return t('custom-table-columns.unlisted')
  }
}
