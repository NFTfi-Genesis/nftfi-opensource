import { useTranslation } from 'src/modules/translation/useTranslation'
import { Address } from 'src/entities/base/Address'
import { Currency } from 'src/entities/domain/Currency'
import { Wei } from 'src/entities/base/Wei'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useAllowance } from 'src/services/hooks/ethereum/useAllowance'
import { useSetAllowance } from 'src/services/hooks/ethereum/useSetAllowance'
import { useSetAllowanceMax } from 'src/services/hooks/ethereum/useSetAllowanceMax'
import { getCurrencyTicker } from 'src/utils/currencies'
import { Check } from './Check'

export type AllowanceCheckProps = {
  currency: Currency
  spender: Address
  amount: Wei
  max?: boolean
}

export function AllowanceCheck({ currency, spender, amount, max }: AllowanceCheckProps) {
  const isMax = max === true

  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { data: allowance, isLoading } = useAllowance(currency, walletAddress, spender)
  const { send: setAllowance } = useSetAllowance()
  const { send: setAllowanceMax } = useSetAllowanceMax()

  // undefined while loading, boolean once data arrives
  const isSufficient = allowance != null
    ? allowance >= amount
    : undefined

  const handleClick = () => {
    if (isMax) {
      setAllowanceMax(currency, spender)
    } else {
      setAllowance(currency, spender, amount)
    }
  }

  return (
    <Check
      isConditionMet={isSufficient}
      text={t('borrow.authorize-erc20-management', { ticker: getCurrencyTicker(currency) })}
      onClick={handleClick}
      isLoading={isLoading}
    />
  )
}
