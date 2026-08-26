import { Signer } from 'ethers'
import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { AuthMode } from 'src/services/types/AuthMode'
import { WalletError } from 'src/errors/WalletError'
import { getCurrencyAddress } from 'src/utils/currencies'
import { generateNonce } from 'src/utils/nonce'
import { AssetOffer } from 'src/entities/domain/Offer'
import { Overwrite } from 'src/typesUtils'
import { Address } from 'src/entities/base/Address'
import { getAssetOfferMessageToSign, getCompatibleRepaymentAmount } from 'src/utils/offers'
import { PanicError } from 'src/errors/PanicError'

export type MakeOfferRequest = {
  type: 'asset'
  nft: {
    contract: string
    tokenId: string
  }
  terms: {
    loan: {
      duration: number
      principal: string
      repayment: string
      origination: string
      currency: string
      expiresAt: string
      prorated: boolean
    }
  }
  lender: {
    nonce: string
    address: string
  }
  borrower?: {
    address: string
  }
  signature: string
}

export type MakeOfferResponse = unknown

const makeOfferMutator = createNftfiApiMutator<MakeOfferResponse, AuthMode.None>({
  authMode: AuthMode.None,
  method: HttpMethod.POST,
})

export type MakeOfferDependencies = NftfiApiMutatorDependencies<AuthMode.None> & {
  getSigner: () => Promise<Signer | null>
}

type TermsWithoutApr = Omit<AssetOffer['terms'], 'apr' | 'effectiveApr'>

export type MakeAssetOfferParams = Omit<AssetOffer, 'signature' | 'nonce' | 'lender' | 'id' | 'dateOffered' | 'terms' | 'isDeleted'> & {
  terms: TermsWithoutApr
  borrower: Address
}

type OfferForSigning = Omit<AssetOffer, 'signature' | 'id' | 'dateOffered' | 'terms' | 'isDeleted'> & {
  terms: TermsWithoutApr
}

type OfferForRequest = Overwrite<OfferForSigning, { signature: string }>

export async function makeAssetOffer(lender: Address, offer: MakeAssetOfferParams, deps: MakeOfferDependencies): Promise<MakeOfferResponse> {
  const signer = await deps.getSigner()
  if (!signer) {
    throw new WalletError({ message: 'Signer is not available' })
  }

  const offerWithLender = {
    ...offer,
    lender,
  }

  const nonce = generateNonce()

  const offerWithNonce = {
    ...offerWithLender,
    nonce: nonce.toString(),
  }

  const compatibleRepaymentAmount = getCompatibleRepaymentAmount(offerWithNonce.terms.repayment)
  const offerWithCompatibleRepayment = {
    ...offerWithNonce,
    terms: {
      ...offerWithNonce.terms,
      repayment: compatibleRepaymentAmount,
    },
  }

  const messageToSign = getAssetOfferMessageToSign(offerWithCompatibleRepayment)
  let signature: string
  try {
    signature = await signer.signMessage(messageToSign)
    if (!signature) {
      throw new PanicError({
        message: 'No signature returned from signer',
        details: {
          offer,
          messageToSign,
          signature,
        }
      })
    }
  } catch (error) {
    if (error?.code === 'ACTION_REJECTED') {
      throw new WalletError({
        message: 'User rejected the signature request',
        tKey: 'error-messages.signature-rejected',
        verbose: true,
      })
    }
    throw error
  }
  const offerWithSignature = {
    ...offerWithCompatibleRepayment,
    signature,
  }

  return makeOfferMutator({
    url: 'v1/offers',
    body: convertOfferToMakeOfferRequest(offerWithSignature),
  }, deps)
}

function convertOfferToMakeOfferRequest(offer: OfferForRequest): MakeOfferRequest {
  return {
    type: 'asset',
    nft: {
      contract: offer.nft.address,
      tokenId: offer.nft.id.toString(),
    },
    terms: {
      loan: {
        duration: offer.terms.duration,
        principal: offer.terms.principal.toString(),
        repayment: offer.terms.repayment.toString(),
        origination: offer.terms.origination.toString(),
        currency: getCurrencyAddress(offer.terms.currency),
        expiresAt: new Date(Number(offer.expiry) * 1000).toISOString(),
        prorated: offer.terms.isProRated,
      },
    },
    lender: {
      nonce: offer.nonce.toString(),
      address: offer.lender,
    },
    borrower: offer.borrower
      ? {
        address: offer.borrower
      }
      : undefined,
    signature: offer.signature,
  }
}
