import { Contract, Signer, TransactionResponse } from 'ethers'
import { Address } from 'src/entities/base/Address'
import { WalletError } from 'src/errors/WalletError'
import { PanicError } from 'src/errors/PanicError'
import { TxReceipt } from 'src/services/types/TxRecipt'
import { OnChainError } from 'src/errors/OnChainError'
import { TxArg } from '../../types/TxArg'

export type CreateOnChainMutatorParams = {
  abi: string[]
  method: string
  contractAddress?: Address
}

export type OnChainMutatorDependencies = {
  getSigner: () => Promise<Signer | null>
}

export type OnChainMutatorParams = {
  contractAddress?: Address
  args: TxArg[]
}

function getTxReceipt(tx: TransactionResponse): TxReceipt {
  return {
    hash: tx.hash,
    blockNumber: tx.blockNumber,
    blockHash: tx.blockHash,
    transactionIndex: tx.index,
  }
}

export function createOnChainMutator(factoryParams: CreateOnChainMutatorParams) {
  /**
   * @throws OnChainError
   */
  return async (params: OnChainMutatorParams, dependencies: OnChainMutatorDependencies): Promise<TxReceipt> => {
    console.log('[mutator creator] start')
    const signer = await dependencies.getSigner()
    console.log('[mutator creator] signer')

    const contractAddress = params.contractAddress ?? factoryParams.contractAddress
    console.log('[mutator creator] contractAddress', contractAddress)

    if (!contractAddress) {
      throw new PanicError({ message: 'Contract address is required in params or factory params or in mutator params' })
    }
    console.log('[mutator creator] contractAddress found')

    if (!signer) {
      throw new WalletError({ message: 'Signer is not available' })
    }
    console.log('[mutator creator] signer found')

    const contract = new Contract(contractAddress, factoryParams.abi, signer)
    console.log('[mutator creator] contract', contract)
    const fn = contract.getFunction(factoryParams.method)
    console.log('[mutator creator] fn', fn)

    try {
      console.log('[mutator creator] fn', fn)
      const tx = await fn(...params.args)
      console.log('[mutator creator] tx', tx)
      const response = await tx.wait()
      console.log('[mutator creator] response', response)
      const receipt = getTxReceipt(response)
      console.log('[mutator creator] receipt', receipt)
      return getTxReceipt(response)
    } catch (error) {
      if (error?.code === 'ACTION_REJECTED') {
        throw new WalletError({
          message: 'User rejected the transaction',
          tKey: 'error-messages.tx-rejected',
          verbose: false,
        })
      }
      throw new OnChainError({ message: 'Failed to execute on-chain transaction', details: {
        code: error.code,
        message: error.message,
        rawError: error,
        from: (await signer.getAddress()) as Address,
        to: contractAddress,
        method: factoryParams.method,
        args: params.args,
      } })
    }
  }
}
