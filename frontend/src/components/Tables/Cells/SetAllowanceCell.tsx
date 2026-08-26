import { memo } from 'react'
import { Button, Stack } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { useSetAllowanceMax } from 'src/services/hooks/ethereum/useSetAllowanceMax'
import { useSetAllowance } from 'src/services/hooks/ethereum/useSetAllowance'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Address } from 'src/entities/base/Address'
import { useWallet } from 'src/modules/wallet/useWallet'
import { NftfiCurrency } from 'src/entities/domain/NftfiCurrency'
import { useAllowance } from 'src/services/hooks/ethereum/useAllowance'
import { Wei } from 'src/entities/base/Wei'
import { isMaxAllowance, isZeroAllowance } from 'src/utils/allowances'

export type SetAllowanceCellProps = {
  spender: Address
  currency: NftfiCurrency
}

export const SetAllowanceCell = memo(function SetAllowanceCell(props: SetAllowanceCellProps) {
  const { spender, currency } = props

  const { t } = useTranslation()
  const { walletAddress } = useWallet()
  const { data: allowance, isUpdating } = useAllowance(currency, walletAddress, spender)
  const { send: setAllowance } = useSetAllowance()
  const { send: setAllowanceMax } = useSetAllowanceMax()

  return (
    <Stack direction='row' gap={1} justifyContent='space-between' height='100%'>
      <Button
        sx={{ alignSelf: 'center' }}
        variant='outlined'
        startIcon={<Iconify icon='ph:arrow-down' />}
        disabled={isZeroAllowance((allowance ?? 0n as Wei)) || isUpdating}
        onClick={() =>
          setAllowance(currency, spender, 0n as Wei)
        }
      >
        {t('custom-table-columns.min')}
      </Button>
      <Button
        sx={{ alignSelf: 'center' }}
        variant='outlined'
        startIcon={<Iconify icon='ph:arrow-up' />}
        disabled={isMaxAllowance((allowance ?? 0n as Wei)) || isUpdating}
        onClick={() =>
          setAllowanceMax(currency, spender)
        }
      >
        {t('custom-table-columns.max')}
      </Button>
    </Stack>
  )
})
