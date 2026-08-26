import { Seconds } from 'src/entities/base/Seconds'
import { Wei } from 'src/entities/base/Wei'
import { Percentage } from 'src/entities/base/Percentage'
import { Currency } from 'src/entities/domain/Currency'

export type Terms = {
  duration: Seconds
  repayment: Wei
  repaymentMax?: Wei
  principal: Wei
  origination: Wei
  currency: Currency
  isProRated: boolean
  apr: Percentage
  effectiveApr: Percentage
}
