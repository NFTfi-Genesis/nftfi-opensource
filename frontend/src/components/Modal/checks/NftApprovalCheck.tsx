import { useTranslation } from 'src/modules/translation/useTranslation'
import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useNftApproval } from 'src/services/hooks/ethereum/useNftApproval'
import { useSetNftApproval } from 'src/services/hooks/ethereum/useSetNftApproval'
import { Check } from './Check'

export type NftApprovalCheckProps = {
  contractAddress: Address
  operator: Address
  tokenId?: bigint // For punks
  minSalePriceInWei?: Wei // For punks
}

export function NftApprovalCheck({
  contractAddress,
  operator,
  tokenId,
  minSalePriceInWei = 0n as Wei,
}: NftApprovalCheckProps) {
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { data: approval, isLoading } = useNftApproval(contractAddress, walletAddress, operator, tokenId)
  const { send: setNftApproval } = useSetNftApproval()

  const handleClick = () => {
    setNftApproval(contractAddress, operator, tokenId, true, minSalePriceInWei)
  }

  return (
    <Check
      isConditionMet={approval ?? undefined}
      text={t('borrow.authorize-nft-management')}
      onClick={handleClick}
      isLoading={isLoading}
    />
  )
}
