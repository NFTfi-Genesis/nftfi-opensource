import { Offer, OfferStatus } from 'src/entities/domain/Offer'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { Loan } from 'src/entities/domain/Loan'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { validateOfferNonce } from './validateOfferNonce'
import { validateLenderAllowanceForOffer } from './validateLenderAllowanceForOffer'
import { validateLenderBalanceForOffer } from './validateLenderBalanceForOffer'

// Loans/refis are being restricted to a 30-day maximum duration. Offers whose
// duration exceeds this are treated as invalid: still visible to the lender in
// Manage Offers (only revoked-nonce offers are hidden there), but filtered out
// of borrower-facing views which only show Active offers.
const MAX_VALID_OFFER_DURATION_DAYS = 30
const MAX_VALID_OFFER_DURATION_SECONDS = MAX_VALID_OFFER_DURATION_DAYS * 24 * 60 * 60

export async function validateOffer<TOffer extends Offer>({ offer, loan }: { offer: TOffer, loan?: Loan }, dependencies: OnChainFetcherDependencies): Promise<TOffer & OfferValidated> {
  const [isValidBalance, isValidAllowance, isValidNonce] = await Promise.all([
    validateLenderBalanceForOffer({ offer, loan }, dependencies),
    validateLenderAllowanceForOffer(offer, dependencies),
    validateOfferNonce(offer, dependencies),
  ])

  const isValidDuration = offer.terms.duration <= MAX_VALID_OFFER_DURATION_SECONDS

  if (isValidBalance && isValidAllowance && isValidNonce && isValidDuration) {
    return {
      ...offer,
      status: OfferStatus.Active,
    }
  }
  return {
    ...offer,
    status: OfferStatus.Invalid,
    invalidReason: {
      insufficientBalance: !isValidBalance,
      insufficientAllowance: !isValidAllowance,
      invalidNonce: !isValidNonce,
      exceedsMaxDuration: !isValidDuration,
    },
  }
}
