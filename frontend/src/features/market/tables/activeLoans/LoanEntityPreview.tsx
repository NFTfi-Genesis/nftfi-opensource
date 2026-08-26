import { EntityDetailsItem } from 'src/components/EntityDetailsDisplay'
import { TFunction } from 'src/modules/translation/TFunction'
import { Percentage } from 'src/entities/base/Percentage'
import { secondsToTimeRemaining } from 'src/utils/time'
import { formatWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import { calculateCurrentEffectiveApr, calculateRepayment } from 'src/utils/terms'
import { formatPercentage } from 'src/utils/numbers'
import { LoanExtended } from 'src/entities/app/LoanExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { LoanMarketInfo } from 'src/entities/app/LoanMarketInfo'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { EntityPreview } from 'src/components/EntityPreview'
import { MultiActionButtonAction } from 'src/components/MultiActionButton/MultiActionButton'

function loanToEntityDetails(loan: LoanExtended<
  | NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
  | LoanMarketInfo
>, t: TFunction): EntityDetailsItem[] {
  const details: EntityDetailsItem[] = []
  const isProRated = loan.terms.isProRated
  const hasOriginationFee = loan.terms.origination > 0n

  const { timeRemaining: timeRemainingNumber, timeUnits } = secondsToTimeRemaining(loan.secondsUntilDue)
  const timeRemaining = {
    title: t('borrow.loan-summary.time-remaining'),
    content: `${timeRemainingNumber} ${t(timeUnits)}`
  }
  const repayment = {
    title: t('borrow.loan-summary.repayment'),
    content: `${formatWei(loan.terms.repayment, loan.terms.currency)} ${getCurrencyTicker(loan.terms.currency)}`,
  }
  const repayNow = {
    title: t('borrow.loan-summary.repay-now'),
    content: `${formatWei(calculateRepayment({
      dateStarted: loan.dateStarted,
      terms: {
        repayment: loan.terms.repayment,
        principal: loan.terms.principal,
        duration: loan.terms.duration,
        isProRated: loan.terms.isProRated,
      },
    }), loan.terms.currency)} ${getCurrencyTicker(loan.terms.currency)}`,
  }
  const endOfTermRepayment = {
    title: t('borrow.loan-summary.end-of-term-repayment'),
    content: `${formatWei(loan.terms.repayment, loan.terms.currency)} ${getCurrencyTicker(loan.terms.currency)}`,
  }
  const ltvChangeDirection: 'up' | 'down' | 'none' = loan.ltvChange === 0 || !loan.ltvChange
    ? 'none'
    : loan.ltvChange > 0
      ? 'up'
      : 'down'
  const currentLtvLtv: EntityDetailsItem = {
    title: t('borrow.loan-summary.current-ltv-ltv'),
    content: `${loan.ltvActual
      ? formatPercentage(loan.ltvActual)
      : '0.00'}%`,
    change: {
      direction: ltvChangeDirection,
      content: loan.ltvChange
        ? formatPercentage(Math.abs(loan.ltvChange) as Percentage)
        : '0.00%',
    },
  }
  const eapr = {
    title: t('borrow.loan-summary.eapr'),
    content: `${formatPercentage(loan.terms.effectiveApr, false)}%`,
  }
  const currentEapr = calculateCurrentEffectiveApr({
    dateStarted: loan.dateStarted,
    terms: {
      repayment: loan.terms.repayment,
      principal: loan.terms.principal,
      duration: loan.terms.duration,
      isProRated: loan.terms.isProRated,
      origination: loan.terms.origination,
    },
  })
  const eaprChangeDirection: 'up' | 'down' | 'none' = currentEapr === loan.terms.effectiveApr
    ? 'none'
    : currentEapr > loan.terms.effectiveApr
      ? 'up'
      : 'down'
  const currentEaprEapr: EntityDetailsItem = {
    title: t('borrow.loan-summary.current-eapr-eapr'),
    content: `${formatPercentage(currentEapr, false)}%`,
    change: {
      direction: eaprChangeDirection,
      content: loan.terms?.effectiveApr
        ? formatPercentage(Math.abs(loan.terms.effectiveApr) as Percentage)
        : '0.00%',
    },
  }
  const apr = {
    title: t('borrow.loan-summary.apr'),
    content: `${formatPercentage(loan.terms.apr)}%`,
  }
  const principal = {
    title: t('borrow.loan-summary.principal'),
    content: `${formatWei(loan.terms.principal, loan.terms.currency)} ${getCurrencyTicker(loan.terms.currency)}`,
  }
  const originationFee = {
    title: t('borrow.loan-summary.origination-fee'),
    content: `${formatWei(loan.terms.origination, loan.terms.currency)} ${getCurrencyTicker(loan.terms.currency)}`,
  }
  const loanType = {
    title: t('borrow.loan-summary.loan-type'),
    content: loan.terms.isProRated
      ? t('borrow.flexible')
      : t('borrow.fixed'),
  }

  // Fixed with Origination Fee
  if(!isProRated && hasOriginationFee) {
    details.push(timeRemaining)
    details.push(repayment)
    details.push(currentLtvLtv)
    details.push(eapr)
    details.push(principal)
    details.push(originationFee)
    details.push(loanType)
  }

  // Fixed without Origination Fee
  if(!isProRated && !hasOriginationFee) {
    details.push(timeRemaining)
    details.push(repayment)
    details.push(currentLtvLtv)
    details.push(apr)
    details.push(principal)
    details.push(loanType)
  }

  // Flexible without Origination Fee
  if(isProRated && !hasOriginationFee) {
    details.push(timeRemaining)
    details.push(repayNow)
    details.push(endOfTermRepayment)
    details.push(currentLtvLtv)
    details.push(eapr)
    details.push(principal)
    details.push(loanType)
  }

  // Flexible with Origination Fee
  if(isProRated && hasOriginationFee) {
    details.push(timeRemaining)
    details.push(repayNow)
    details.push(endOfTermRepayment)
    details.push(currentLtvLtv)
    details.push(currentEaprEapr)
    details.push(principal)
    details.push(originationFee)
    details.push(loanType)
  }

  return details
}

export type LoanEntityPreviewProps = {
  loan: LoanExtended<
    | NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
    | LoanMarketInfo
  >
  prioritisedActions?: MultiActionButtonAction[] | null
}

export function LoanEntityPreview({ loan, prioritisedActions }: LoanEntityPreviewProps) {
  const { t } = useTranslation()
  return (
    <EntityPreview
      nftDetails={loan && {
        nft: loan.nft,
      }}
      entityDetails={loanToEntityDetails(loan, t)}
      prioritisedActions={prioritisedActions}
    />
  )
}
