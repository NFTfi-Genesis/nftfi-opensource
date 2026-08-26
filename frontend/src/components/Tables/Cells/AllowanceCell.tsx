import { memo } from 'react'
import { Address } from 'src/entities/base/Address'
import { NftfiCurrency } from 'src/entities/domain/NftfiCurrency'
import { useAllowance } from 'src/services/hooks/ethereum/useAllowance'
import { useWallet } from 'src/modules/wallet/useWallet'
import { isMaxAllowance } from 'src/utils/allowances'
import { Wei } from 'src/entities/base/Wei'
import { weiToAmount } from 'src/utils/amounts'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { LoadingCell } from './LoadingCell'
import { AmountCell } from './AmountCell'
import { TextWithSubtextCell } from './TextWithSubtextCell'

export type AllowanceCellProps = {
  spender: Address
  currency: NftfiCurrency
}

export const AllowanceCell = memo(function AllowanceCell(props: AllowanceCellProps) {
  const { t } = useTranslation()
  const { spender, currency } = props
  const { walletAddress } = useWallet()
  const { data: allowance, isUpdating } = useAllowance(currency, walletAddress, spender)

  const isMax = isMaxAllowance(allowance ?? 0n as Wei)

  if (isUpdating) {
    return (
      <LoadingCell size={28} align='right' />
    )
  }

  return (
    <>
      {isMax
        ? <TextWithSubtextCell
          text={t('custom-table-columns.max')}
          subtext={''}
        />
        : <AmountCell
          amount={weiToAmount(allowance ?? 0n as Wei, currency)}
          currency={currency}
          amountTooltip={{
            offset: [80, 0],
          }}
        />
      }
    </>
  )
})
