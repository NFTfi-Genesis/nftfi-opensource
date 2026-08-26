import { Address } from 'src/entities/base/Address'
import { Seconds } from 'src/entities/base/Seconds'
import { LoanExtensionOffer, LoanExtensionOfferStatus } from 'src/entities/domain/LoanExtensionOffer'
import { createNftfiApiFetcher, NftfiApiFetcherDependencies } from 'src/services/factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from 'src/services/types/AuthMode'

// Mirrors nftfi.api RenegotiationV1Dto (feature/renegotiations-v1)
type RenegotiationV1Dto = {
  id: number
  loan: { id: string, contract: string }
  status: LoanExtensionOfferStatus
  party: 'borrower' | 'lender'
  lender: { address: string, nonce: string | null }
  borrower: { address: string }
  terms: {
    loan: {
      duration: number
      renegotiationFee: string
      expiresAt: string
    }
  }
  signature: string | null
  message: string | null
  createdAt: string
}

const fetcher = createNftfiApiFetcher<RenegotiationV1Dto[], AuthMode.None>({
  authMode: AuthMode.None,
})

export async function getLoanExtensionOfferForLoan(
  // `contract` filters against MarketLoan.contract, which is the contract ADDRESS
  // (not the dot-notation name) — sending the name matches zero rows.
  params: { loanContract: string, loanId: number },
  dependencies: NftfiApiFetcherDependencies<AuthMode.None>,
): Promise<LoanExtensionOffer | null> {
  const query = new URLSearchParams({
    loanId: String(params.loanId),
    contract: params.loanContract,
    status: LoanExtensionOfferStatus.Active,
    limit: '1',
  })

  const offers = await fetcher({ url: `/v1/renegotiations?${query.toString()}` }, dependencies)
  const dto = offers[0]
  if (!dto) {
    return null
  }
  return convertToLoanExtensionOffer(dto)
}

function convertToLoanExtensionOffer(dto: RenegotiationV1Dto): LoanExtensionOffer | null {
  if (dto.status !== LoanExtensionOfferStatus.Active || !dto.signature) {
    return null
  }

  return {
    id: dto.id,
    loanId: Number(dto.loan.id),
    loanContract: dto.loan.contract.toLowerCase() as Address,
    lender: dto.lender.address.toLowerCase() as Address,
    borrower: dto.borrower.address.toLowerCase() as Address,
    terms: {
      duration: dto.terms.loan.duration as Seconds,
      fee: BigInt(dto.terms.loan.renegotiationFee),
    },
    lenderNonce: BigInt(dto.lender.nonce ?? '0'),
    expiry: Math.floor(new Date(dto.terms.loan.expiresAt).getTime() / 1000) as Seconds,
    signature: dto.signature,
    status: dto.status,
    createdDate: new Date(dto.createdAt),
  }
}
