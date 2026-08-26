import { memo, useCallback, useState, useMemo, useEffect } from 'react'
import { Stack, Button } from '@mui/material'
import { ToggleGroupInput } from 'src/components/Forms/ToggleGroupInput'
import { ToggleGroupWithCustomIntegerInput } from 'src/components/Forms/ToggleGroupWithCustomIntegerInput'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { LoanTermsPreference } from 'src/entities/domain/Listing'
import { enumToArray } from 'src/utils/enums'
import { currencyOptions, CurrencyOptions, getCurrencyOptionsDisplayText, getIsProratedOptionsDisplayText, isProratedOptions, IsProratedOptions } from 'src/utils/terms'
import { getListingPreferenceOptionsDisplayText } from 'src/utils/listings'
import { Days } from 'src/entities/base/Days'
import { offerDurationPresetOptions } from 'src/features/offers/useOffersTablesState'
import { WalletNftsTableRow } from 'src/features/nfts/walletNfts/WalletNftsTable'
import { NftInfoDisplay } from 'src/components/NftInfoDisplay'
import { ConnectWalletWarning } from 'src/components/ConnectWallet/ConnectWalletWarning'
import { LoginWarning } from 'src/components/ConnectWallet/LoginWarning'
import { getTestId } from 'src/utils/testing'

export enum ManageListingMode {
  List = 'list',
  Edit = 'edit',
  Unlist = 'unlist',
}

export type ManageListingProps = {
  mode: ManageListingMode
  nft: WalletNftsTableRow
  onClose: () => void
  onSubmit?: (data: ManageListingFormData) => void
}

export type ManageListingFormData = {
  currency: CurrencyOptions
  isProRated: IsProratedOptions
  duration: Days
  preference: LoanTermsPreference
}

const defaultFormData: ManageListingFormData = {
  currency: null,
  isProRated: null,
  duration: 7 as Days,
  preference: LoanTermsPreference.LowApr,
}

const loanPreferenceOptions = enumToArray(LoanTermsPreference)

export const ManageListing = memo(function ManageListing({
  mode,
  nft,
  onClose,
  onSubmit,
}: ManageListingProps) {
  const { t } = useTranslation()
  const { isWalletAvailable } = useWallet()
  const { isAuthenticated } = useAuth()
  const isViewMode = mode === ManageListingMode.Unlist

  const [formData, setFormData] = useState<ManageListingFormData>(defaultFormData)

  // Initialize form with existing listing data when editing or unlisting
  useEffect(() => {
    if ((mode === ManageListingMode.Edit || mode === ManageListingMode.Unlist) && nft.listing) {
      setFormData({
        currency: nft.listing.desiredTerms.currency as CurrencyOptions,
        isProRated: nft.listing.desiredTerms.isProRated,
        duration: nft.listing.desiredTerms.duration as Days,
        preference: nft.listing.desiredTerms.preference,
      })
    }
  }, [mode, nft.listing])

  const ctaText = useMemo(() => {
    switch (mode) {
      case ManageListingMode.List:
        return t('borrow.list-asset')
      case ManageListingMode.Edit:
        return t('borrow.edit-terms')
      case ManageListingMode.Unlist:
        return t('borrow.unlist-asset')
    }
  }, [mode, t])

  const handleSubmit = useCallback(() => {
    onSubmit?.(formData)
    onClose()
  }, [formData, onSubmit, onClose])

  const handleCurrencyChange = useCallback((value: CurrencyOptions) => {
    setFormData(prev => ({ ...prev, currency: value }))
  }, [])

  const handleLoanTypeChange = useCallback((value: IsProratedOptions) => {
    setFormData(prev => ({ ...prev, isProRated: value }))
  }, [])

  const handleDurationChange = useCallback((value: number) => {
    setFormData(prev => ({ ...prev, duration: value as Days }))
  }, [])

  const handlePreferenceChange = useCallback((value: LoanTermsPreference) => {
    setFormData(prev => ({ ...prev, preference: value }))
  }, [])

  if (!isWalletAvailable) {
    return <ConnectWalletWarning />
  }

  if (!isAuthenticated) {
    return <LoginWarning />
  }

  return (
    <Stack gap={2} marginTop={4}>
      <NftInfoDisplay nft={nft} />

      <Stack gap={2} sx={isViewMode
        ? { opacity: 0.6, pointerEvents: 'none' }
        : {}}>
        <ToggleGroupInput
          label={t('borrow.currency-preference')}
          name='currency'
          value={formData.currency}
          onChange={handleCurrencyChange}
          options={currencyOptions}
          formatOption={option => getCurrencyOptionsDisplayText(option, t)}
        />

        <ToggleGroupInput
          label={t('filters.loan-type')}
          name='loan-type'
          value={formData.isProRated}
          onChange={handleLoanTypeChange}
          options={isProratedOptions}
          formatOption={option => getIsProratedOptionsDisplayText(option, t)}
        />

        <ToggleGroupWithCustomIntegerInput
          label={t('borrow.duration-days')}
          name='duration'
          value={formData.duration}
          onChange={handleDurationChange}
          options={offerDurationPresetOptions}
        />

        <ToggleGroupInput
          label={t('borrow.loan-preference')}
          name='loan-preference'
          value={formData.preference}
          onChange={handlePreferenceChange}
          options={loanPreferenceOptions}
          formatOption={option => getListingPreferenceOptionsDisplayText(option, t)}
        />
      </Stack>

      <Button
        variant='contained'
        color='primary'
        fullWidth
        onClick={handleSubmit}
        {...getTestId('borrow.list.submit')}
      >
        {ctaText}
      </Button>
    </Stack>
  )
})
