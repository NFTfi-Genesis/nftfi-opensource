import { Signer } from 'ethers'
import { config } from 'src/config/config'
import { Address } from 'src/entities/base/Address'
import { Seconds } from 'src/entities/base/Seconds'
import { Loan } from 'src/entities/domain/Loan'
import { LoanExtensionOfferTerms } from 'src/entities/domain/LoanExtensionOffer'
import { PanicError } from 'src/errors/PanicError'
import { WalletError } from 'src/errors/WalletError'
import { getNftfiLoanContractAndORId } from 'src/services/fetchers/ethereum/getNftfiLoanContractAndORId'
import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { OnChainFetcherDependencies } from 'src/services/factories/onChain/createOnChainFetcher'
import { AuthMode } from 'src/services/types/AuthMode'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { getV3LoanExtensionMessageToSign } from 'src/utils/loanExtension'
import { generateNonce } from 'src/utils/nonce'

const SIGNATURE_VALIDITY_SECONDS = 7 * 24 * 60 * 60

type PostOfferResponse = unknown

// Mirrors nftfi.api DraftRenegotiationV1Dto (feature/renegotiations-v1).
// loan.id is the loan's PostgreSQL primary key (positive integer), not the on-chain loanId.
type DraftRenegotiationV1Body = {
  loan: { id: number }
  lender: { address: string, nonce: string }
  terms: {
    loan: {
      duration: number
      renegotiationFee: string
      expiresAt: string
    }
  }
  signature: string
  message: string | null
}

const postOfferMutator = createNftfiApiMutator<PostOfferResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.POST,
})

export type SignAndPostLoanExtensionOfferDependencies
  = & NftfiApiMutatorDependencies<AuthMode.Required>
  & OnChainFetcherDependencies
  & { getSigner: () => Promise<Signer | null> }

export type SignAndPostLoanExtensionOfferParams = {
  loan: Pick<Loan, 'marketLoanId' | 'loanId' | 'loanContract' | 'lender' | 'terms'>
  terms: LoanExtensionOfferTerms
  message?: string
}

export async function signAndPostLoanExtensionOffer(
  params: SignAndPostLoanExtensionOfferParams,
  dependencies: SignAndPostLoanExtensionOfferDependencies,
): Promise<PostOfferResponse> {
  const { loan, terms, message } = params

  const signer = await dependencies.getSigner()
  if (!signer) {
    throw new WalletError({ message: 'Signer is not available' })
  }

  const signerAddress = (await signer.getAddress()).toLowerCase()
  if (signerAddress !== loan.lender.toLowerCase()) {
    throw new WalletError({
      message: 'Connected wallet is not the loan lender; signature would not verify on-chain',
      tKey: 'error-messages.wrong-lender-wallet',
      verbose: true,
      details: { signerAddress, expectedLender: loan.lender, loanId: loan.loanId },
    })
  }

  if (loan.terms.repaymentMax == null) {
    throw new PanicError({ message: 'Loan repaymentMax is required to extend', details: { loanId: loan.loanId } })
  }

  const { loanContractAddress } = await getNftfiLoanContractAndORId(loan.loanId, dependencies)

  const lenderNonce = generateNonce()
  const expiry = (Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS) as Seconds

  // Extension is duration-only: repayment + pro-rata are unchanged, taken from the current loan.
  // The lender signature must be computed over those exact values so the on-chain
  // renegotiateLoan(...) signature check (and the API's reconstruction) verify.
  const messageToSign = getV3LoanExtensionMessageToSign({
    loanId: loan.loanId,
    newLoanDuration: terms.duration,
    isProRata: loan.terms.isProRated ?? false,
    newMaxRepayment: loan.terms.repaymentMax,
    extensionFee: terms.fee,
    lender: loan.lender as Address,
    lenderNonce,
    expiry,
    contractAddress: loanContractAddress,
    chainId: config.ethereum.chainId,
  })

  let signature: string
  try {
    signature = await signer.signMessage(messageToSign)
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

  if (!signature) {
    throw new PanicError({ message: 'No signature returned from signer', details: { messageToSign } })
  }

  const body: DraftRenegotiationV1Body = {
    loan: { id: loan.marketLoanId },
    lender: { address: loan.lender.toLowerCase(), nonce: lenderNonce.toString() },
    terms: {
      loan: {
        duration: terms.duration,
        renegotiationFee: terms.fee.toString(),
        expiresAt: new Date(expiry * 1000).toISOString(),
      },
    },
    signature,
    message: message ?? null,
  }

  return postOfferMutator({ url: '/v1/renegotiations', body }, dependencies)
}
