import { Currency } from 'src/entities/domain/Currency'
import { Address } from 'src/entities/base/Address'
import { NftfiCurrency } from 'src/entities/domain/NftfiCurrency'

export const CurrencyTicker: Record<Currency, string> = {
  [Currency.DAI]: 'DAI',
  [Currency.USDC]: 'USDC',
  [Currency.WETH]: 'wETH',
  [Currency.WSTETH]: 'wstETH',
  [Currency.USD]: 'USD',
}

export const CurrencyAddress: Record<Currency, Address> = {
  [Currency.DAI]: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address,
  [Currency.USDC]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address,
  [Currency.WETH]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address,
  [Currency.WSTETH]: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as Address,
  [Currency.USD]: '0x0000000000000000000000000000000000000000' as Address,
}

export const CurrencyDecimals: Record<Currency, number>
  = {
    [Currency.DAI]: 18,
    [Currency.USDC]: 6,
    [Currency.WETH]: 18,
    [Currency.WSTETH]: 18,
    [Currency.USD]: 2,
  }

export function getCurrencyTicker(currency: Currency): string {
  return CurrencyTicker[currency]
}

export function getCurrencyFromName(name: string): Currency | null {
  if (name.toLowerCase().includes('dai')) return Currency.DAI
  if (name.toLowerCase().includes('usdc')) return Currency.USDC
  if (name.toLowerCase().includes('weth')) return Currency.WETH
  if (name.toLowerCase().includes('wsteth')) return Currency.WSTETH
  if (name.toLowerCase() === 'eth') return Currency.WETH
  if (name.toLowerCase() === 'usd') return Currency.USD
  return null
}

export function getCurrencyAddress(currency: Currency): Address {
  return CurrencyAddress[currency]
}

export function getCurrencyFromAddress(
  address: Address
): Currency | null {
  const currencyKey = Object.entries(CurrencyAddress).find(
    ([, addr]) => address.toLowerCase() === addr.toLowerCase()
  )?.[0]

  if (!currencyKey) return null

  return Currency[currencyKey as keyof typeof Currency]
}

export function getCurrencyFromNameOrAddress(nameOrAddress: Address | string): Currency | null {
  return getCurrencyFromAddress(nameOrAddress as Address) ?? getCurrencyFromName(nameOrAddress)
}

export function isNftfiCurrency(currency: Currency): currency is NftfiCurrency {
  return [Currency.USDC, Currency.WETH, Currency.DAI].includes(currency)
}
