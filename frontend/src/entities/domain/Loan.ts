import { Seconds } from 'src/entities/base/Seconds'
import { Address } from 'src/entities/base/Address'
import { Nft } from 'src/entities/domain/Nft'
import { Protocol } from 'src/entities/domain/Protocol'
import { Terms } from 'src/entities/domain/Terms'
import { Overwrite } from 'src/typesUtils'

export enum LoanStatus {
  Liquidated = 'Liquidated',
  Active = 'Active',
  Defaulted = 'Defaulted',
  Repaid = 'Repaid',
}

// Type argument here is for type inference purposes
export type Loan<P extends Protocol = Protocol> = {
  id: string
  /** nftfi.api PostgreSQL primary key for the loan row (unique per loan). Distinct from the on-chain `loanId`. */
  marketLoanId: number
  loanId: number
  nft: Nft
  status: LoanStatus
  dateStarted: Date
  loanStartTx?: string
  dateDue: P extends Protocol.Blur ? Date | null : Date
  secondsUntilDue?: Seconds
  dateRepaid?: Date
  dateLiquidated?: Date
  borrower: Address
  lender: Address
  loanContractName?: string
  loanContract?: Address
  protocol: P
  terms: LoanTermsByProtocol<P>
}

type LoanTermsByProtocol<P extends Protocol> = Overwrite<Terms, {
  duration: P extends Protocol.Blur ? Seconds | null : Seconds
  isProRated: P extends Exclude<Protocol, Protocol.Nftfi> ? undefined : boolean
}>

// TODO: probably move to a different place
export enum LoansSortBy {
  protocolName = 'protocolName',
  nftProjectName = 'nftProjectName',
  principalAmount = 'principalAmount',
  maximumRepaymentAmount = 'maximumRepaymentAmount',
  apr = 'apr',
  durationDays = 'durationDays',
  dueTime = 'dueTime',
  borrowerAddress = 'borrowerAddress',
  lenderAddress = 'lenderAddress',
  startTime = 'startTime',
  secondsUntilDue = 'secondsUntilDue',
}
