import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Currency } from 'src/entities/domain/Currency'
import { Wei } from 'src/entities/base/Wei'
import { Address } from 'src/entities/base/Address'
import { DataKeys } from '../../keys/keys'
import { setAllowance } from '../../mutators/ethereum/setAllowance'
import { useMutator } from '../base/useMutator'

export function useSetAllowance() {
  const { getSigner, walletAddress } = useWallet()

  const getKey = useCallback((currency: Currency, spender: Address, _: Wei) => DataKeys.allowance(currency, walletAddress, spender), [walletAddress])

  return useMutator(
    {
      getKey,
      mutator: async (currency, spender, amount) => await setAllowance(currency, spender, amount, { getSigner }),
    },
  )
}
