import { useTranslation } from 'src/modules/translation/useTranslation'
import { Loan } from 'src/entities/domain/Loan'
import { useMintOR } from 'src/services/hooks/ethereum/useMintOR'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useIsORMinted } from 'src/services/hooks/ethereum/useIsORMinted'
import { Check } from './Check'

export type MintORCheckProps = {
  loanId: Loan['loanId']
}

export function MintORCheck({ loanId }: MintORCheckProps) {
  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { data: isORMinted, isLoading } = useIsORMinted(loanId, walletAddress)
  const { send: mintOR } = useMintOR()

  const handleClick = () => {
    mintOR(loanId)
  }

  return (
    <Check
      isConditionMet={isORMinted ?? undefined}
      text={t('borrow.mint-obligation-receipt')}
      onClick={handleClick}
      isLoading={isLoading}
    />
  )
}
