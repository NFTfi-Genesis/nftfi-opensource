import { Signer } from 'ethers'
import { createHttpJsonMutator } from 'src/services/factories/http/createHttpJsonMutator'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { config } from 'src/config/config'
import { WalletError } from 'src/errors/WalletError'
import { Address } from 'src/entities/base/Address'
import { generateNonce } from 'src/utils/nonce'

export type NftfiApiAuthorizeResponse = {
  token: string
  refreshToken: string
}

export type AuthorizeDependencies = {
  getSigner: () => Promise<Signer | null>
}

const authorizeMutator = createHttpJsonMutator<NftfiApiAuthorizeResponse>({
  method: HttpMethod.POST,
  baseUrl: config.apiServices.nftfiSdkApiUrl,
  headers: {
    'x-api-key': config.apiServices.nftfiSdkApiKey,
  }
})

export async function authorize(walletAddress: Address, deps: AuthorizeDependencies): Promise<{
  token: string
  refreshToken: string
}> {
  const nonce = generateNonce().toString()
  const signer = await deps.getSigner()
  if (!signer) {
    throw new WalletError({ message: 'Signer is not available' })
  }
  const message = `This message proves you own this wallet address : ${walletAddress}`
  const messageToSign = `${message}\r\n\r\nChainId : ${config.ethereum.chainId}\r\nNonce : ${nonce})`

  const signedMessage = await signer.signMessage(messageToSign)

  const response = await authorizeMutator({
    url: '/v1/auth/token',
    body: {
      accountAddress: walletAddress,
      message,
      nonce,
      signedMessage,
      multisig: {}
    },
  })
  if (!response.token || !response.refreshToken) {
    throw new Error('Invalid response from authorize')
  }
  return {
    token: response.token,
    refreshToken: response.refreshToken,
  }
}
