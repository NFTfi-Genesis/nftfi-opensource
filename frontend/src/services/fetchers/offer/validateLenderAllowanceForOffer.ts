import { Offer } from 'src/entities/domain/Offer'
import { getCurrencyTicker, isNftfiCurrency } from 'src/utils/currencies'
import { PanicError } from 'src/errors/PanicError'
import { config } from 'src/config/config'
import { Wei } from 'src/entities/base/Wei'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { getAllowance } from '../ethereum/getAllowance'

const erc20ManagerAddress = config.ethereum.contracts.nftfi.v3.erc20Manager.address

const cachedAllowances = new Map<string, Wei>()
const cacheTime = 100

export async function validateLenderAllowanceForOffer(offer: Offer, dependencies: OnChainFetcherDependencies) {
  const principal = offer.terms.principal
  const lender = offer.lender

  if (!isNftfiCurrency(offer.terms.currency)) {
    throw new PanicError({ message: 'Non-supported currency in offer', details: { offer } })
  }

  const cacheKey = `${lender}-${getCurrencyTicker(offer.terms.currency)}`

  if (cachedAllowances.has(cacheKey)) {
    return cachedAllowances.get(cacheKey)! >= principal
  }

  const allowance = await getAllowance(offer.terms.currency, lender, erc20ManagerAddress, dependencies)

  cachedAllowances.set(cacheKey, allowance)
  setTimeout(() => {
    cachedAllowances.delete(cacheKey)
  }, cacheTime)

  return allowance >= principal
}
