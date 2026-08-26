import { useMemo, useState, useCallback } from 'react'
import { Stack } from '@mui/material'
import { Helmet } from 'react-helmet-async'
import { Panel } from 'src/components/Panel'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuth } from 'src/modules/auth/useAuth'
import { ConnectWalletWarning } from 'src/components/ConnectWallet/ConnectWalletWarning'
import { LoginWarning } from 'src/components/ConnectWallet/LoginWarning'
import { ManageOffersTable } from 'src/features/offers/manageOffers/ManageOffersTable'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { SplitView } from 'src/components/Views/SplitView'
import { LocalStorageKeys } from 'src/modules/localStorage/config'
import { useLocalStorage } from 'src/modules/localStorage/useLocalStorage'
import { EntityPreview } from 'src/components/EntityPreview'
import { LenderOffersTable } from 'src/features/offers/lendOffers/LenderOffersTable'
import { CollectionOffersTable } from 'src/features/offers/collectionOffers/CollectionOffersTable'
import { ManageOffersTableRow } from 'src/features/offers/manageOffers/useManageOffersTableState'
import { isAssetOffer, isCollectionOffer } from 'src/utils/offers'
import { LendPageTabs } from './LendPageTabs'

export function ManageOffersPage() {
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { isAuthenticated } = useAuth()
  const [splitPercentage, setSplitPercentage] = useLocalStorage(LocalStorageKeys.Splits.ManageOffersSplit)
  const [offerSelected, setOfferSelected] = useState<ManageOffersTableRow | null>(null)

  const handleRowClick = useCallback((row: ManageOffersTableRow) => {
    if (isAssetOffer(row) || isCollectionOffer(row)) {
      setOfferSelected(row)
    }
  }, [])

  const content = useMemo(() => {
    if (!walletAddress) {
      return (
        <Panel fullWidth fullHeight noPadding>
          <Stack direction='column' gap={0} height='100%' width='100%'>
            <LendPageTabs />
            <ConnectWalletWarning />
          </Stack>
        </Panel>
      )
    }

    if (!isAuthenticated) {
      return (
        <Panel fullWidth fullHeight noPadding>
          <Stack direction='column' gap={0} height='100%' width='100%'>
            <LendPageTabs />
            <LoginWarning />
          </Stack>
        </Panel>
      )
    }

    return (
      <SplitView
        splitPercentage={splitPercentage}
        setSplitPercentage={setSplitPercentage}
        leftHeader={<LendPageTabs />}
        leftContent={
          <ManageOffersTable
            onRowClick={handleRowClick}
            selectedRow={offerSelected}
          />
        }
        rightHeader={
          offerSelected && isAssetOffer(offerSelected)
            ? (
              <EntityPreview nftDetails={{ nft: offerSelected.nft }} />
            )
            : offerSelected && isCollectionOffer(offerSelected)
              ? (
                <EntityPreview collectionDetails={{ collection: offerSelected.collection }} />
              )
              : null
        }
        rightContent={
          offerSelected && isAssetOffer(offerSelected)
            ? <LenderOffersTable nft={offerSelected.nft} />
            : offerSelected && isCollectionOffer(offerSelected)
              ? <CollectionOffersTable collection={offerSelected.collection} />
              : null
        }
        leftMinWidthPct={20}
        rightMinWidthPct={40}
        closeRightPanel={() => setOfferSelected(null)}
      />
    )
  }, [walletAddress, isAuthenticated, splitPercentage, setSplitPercentage, offerSelected, handleRowClick])

  return (
    <>
      <Helmet>
        <title>{t('page-titles.manage-my-offers')}</title>
      </Helmet>
      {content}
    </>
  )
}
