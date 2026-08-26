import { Box, Stack } from '@mui/material'
import { Helmet } from 'react-helmet-async'
import { Panel } from 'src/components/Panel'
import { HistoricalLoansTable } from 'src/features/loansHistorical/HistoricalLoansTable'
import { useWallet } from 'src/modules/wallet/useWallet'
import { ConnectWalletPanel } from 'src/components/ConnectWallet/ConnectWalletPanel'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { LendPageTabs } from './LendPageTabs'

export function HistoricalLenderLoansPage() {
  const { t } = useTranslation()
  const { isWalletAvailable, walletAddress } = useWallet()

  if (!isWalletAvailable || !walletAddress) return <ConnectWalletPanel />

  return (
    <>
      <Helmet>
        <title>{t('page-titles.lend-history')}</title>
      </Helmet>
      <Panel fullWidth fullHeight noPadding>
        <Stack direction='column' sx={{ height: '100%', overflow: 'hidden' }}>
          <LendPageTabs showBorderLine={false} />
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <HistoricalLoansTable side='lender' wallet={walletAddress} />
          </Box>
        </Stack>
      </Panel>
    </>
  )
}
