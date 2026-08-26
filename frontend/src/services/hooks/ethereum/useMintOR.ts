import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Loan } from 'src/entities/domain/Loan'
import { mintOR } from '../../mutators/ethereum/mintOR'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useMintOR() {
  const { getSigner, getProvider, walletAddress } = useWallet()

  const getKey = useCallback((loanId: Loan['loanId']) => DataKeys.isORMinted(loanId, walletAddress), [walletAddress])

  return useMutator({
    getKey,
    mutator: async (loanId: Loan['loanId']) => await mintOR(loanId, { getSigner, getProvider }),
  })
}
