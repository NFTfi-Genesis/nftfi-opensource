import { Offer } from 'src/entities/domain/Offer'
import { isNftfiCurrency, getCurrencyTicker } from 'src/utils/currencies'
import { PanicError } from 'src/errors/PanicError'
import { Wei } from 'src/entities/base/Wei'
import { Loan } from 'src/entities/domain/Loan'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { getBalance } from '../ethereum/getBalance'

const cachedBalances = new Map<string, Wei>()
const cacheTime = 100

export async function validateLenderBalanceForOffer({ offer, loan }: { offer: Offer, loan?: Loan }, dependencies: OnChainFetcherDependencies) {
  const lender = offer.lender
  const amountNeeded = loan && loan.lender === offer.lender
    ? offer.terms.principal - loan.terms.repayment
    : offer.terms.principal

  if (!isNftfiCurrency(offer.terms.currency)) {
    throw new PanicError({ message: 'Non-supported currency in offer', details: { offer } })
  }

  const cacheKey = `${lender}-${getCurrencyTicker(offer.terms.currency)}`

  if (cachedBalances.has(cacheKey)) {
    return cachedBalances.get(cacheKey)! >= amountNeeded
  }

  const balance = await getBalance(offer.terms.currency, lender, dependencies)
  cachedBalances.set(cacheKey, balance)
  setTimeout(() => {
    cachedBalances.delete(cacheKey)
  }, cacheTime)

  return balance >= amountNeeded
}
