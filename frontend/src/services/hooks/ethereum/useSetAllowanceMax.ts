import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Currency } from 'src/entities/domain/Currency'
import { Address } from 'src/entities/base/Address'
import { DataKeys } from '../../keys/keys'
import { setAllowanceMax } from '../../mutators/ethereum/setAllowanceMax'
import { useMutator } from '../base/useMutator'

export function useSetAllowanceMax() {
  const { getSigner, walletAddress } = useWallet()

  const getKey = useCallback((currency: Currency, spender: Address) => DataKeys.allowance(currency, walletAddress, spender), [walletAddress])

  return useMutator(
    {
      getKey,
      mutator: async (currency, spender) => await setAllowanceMax(currency, spender, { getSigner }),
    }
  )
}
