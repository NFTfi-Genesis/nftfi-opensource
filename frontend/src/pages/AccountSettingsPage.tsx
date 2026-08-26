import { Stack } from '@mui/material'
import { Helmet } from 'react-helmet-async'

import { useTranslation } from 'src/modules/translation/useTranslation'
import { useWallet } from 'src/modules/wallet/useWallet'
import { ConnectWalletPanel } from 'src/components/ConnectWallet/ConnectWalletPanel'
import { AccountSettings } from 'src/features/account/settings/AccountSettings'
import { Allowances } from 'src/features/account/settings/Allowances'

export function AccountSettingsPage() {
  const { t } = useTranslation()
  const { isWalletAvailable } = useWallet()

  if (!isWalletAvailable) return <ConnectWalletPanel />

  return (
    <>
      <Helmet>
        <title>{t('page-titles.user-details')}</title>
      </Helmet>
      <Stack width='100%' direction='column' height='100%' gap={3}>
        <AccountSettings />
        <Allowances />
      </Stack>
    </>
  )
}
