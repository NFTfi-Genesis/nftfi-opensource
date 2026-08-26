import { LoanStatus } from 'src/entities/domain/Loan'
import { TKey } from 'src/modules/translation/TKey'
import { PanicError } from 'src/errors/PanicError'

export function getLoanStatus(status: string): LoanStatus {
  if (status === 'repaid') return LoanStatus.Repaid
  if (status === 'liquidated') return LoanStatus.Liquidated
  if (status === 'defaulted') return LoanStatus.Defaulted
  if (status === 'active') return LoanStatus.Active
  throw new PanicError({
    message: `Unknown loan status: ${status}`,
  })
}

export const LoanStatusDisplayKeys: Record<LoanStatus, TKey> = {
  [LoanStatus.Active]: 'loan-status.active',
  [LoanStatus.Repaid]: 'loan-status.repaid',
  [LoanStatus.Liquidated]: 'loan-status.liquidated',
  [LoanStatus.Defaulted]: 'loan-status.defaulted',
}
