import { Contract, JsonRpcProvider } from 'ethers'
import { Address } from 'src/entities/base/Address'
import { PanicError } from 'src/errors/PanicError'
import { OnChainError } from 'src/errors/OnChainError'
import { TxArg } from '../../types/TxArg'

export type CreateOnChainFetcherParams = {
  abi: string[]
  method: string
  contractAddress?: Address
}

export type OnChainFetcherDependencies = {
  getProvider: () => Promise<JsonRpcProvider>
}

export type OnChainFetcherParams = {
  contractAddress?: Address
  args: TxArg[]
}

export function createOnChainFetcher<TResponse>(factoryParams: CreateOnChainFetcherParams) {
  /**
   * @throws OnChainError
   */
  return async (params: OnChainFetcherParams, dependencies: OnChainFetcherDependencies): Promise<TResponse> => {
    const provider = await dependencies.getProvider()

    const contractAddress = params.contractAddress ?? factoryParams.contractAddress

    if (!contractAddress) {
      throw new PanicError({ message: 'Contract address is required in params or factory params or in fetcher params' })
    }

    const contract = new Contract(contractAddress, factoryParams.abi, provider)
    const fn = contract.getFunction(factoryParams.method)

    try {
      const result = await fn(...params.args)
      return result as TResponse
    } catch (error) {
      throw new OnChainError({
        message: 'Failed to query on-chain data',
        tKey: 'error-messages.defaults.onchain-query',
        details: {
          code: error.code,
          message: error.message,
          rawError: error,
          to: contractAddress,
          method: factoryParams.method,
          args: params.args,
        },
      })
    }
  }
}
