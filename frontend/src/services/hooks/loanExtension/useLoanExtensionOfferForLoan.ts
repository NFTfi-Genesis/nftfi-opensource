import { Loan } from 'src/entities/domain/Loan'
import { getLoanExtensionOfferForLoan } from 'src/services/fetchers/loanExtension/getLoanExtensionOfferForLoan'
import { DataKeys } from '../../keys/keys'
import { useFetcher, UseFetcherOptions } from '../base/useFetcher'

export function useLoanExtensionOfferForLoan(loan: Loan | null, options?: UseFetcherOptions) {
  const loanContract = loan?.loanContract ?? null
  const loanId = loan?.loanId ?? null

  return useFetcher(
    DataKeys.loanExtensionOfferForLoan(loanContract, loanId),
    () => getLoanExtensionOfferForLoan(
      { loanContract: loanContract!, loanId: loanId! },
      null as never,
    ),
    {
      ...options,
      shouldExecute: Boolean(loanContract && loanId !== null) && (options?.shouldExecute ?? true),
    },
  )
}
