import { Address } from 'src/entities/base/Address'

// TODO: Move to utils Addresses? check where it's used
export function shortenMiddleEllipsis(input: string): string {
  if (input.length <= 8) return input

  return `${input.slice(0, 4)}...${input.slice(-4)}`
}

// TODO: Move to utils Addresses
export function shortenAddressMiddle(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function truncateText(value: string, limit: number): string {
  return value.length > limit
    ? `${value.slice(0, limit - 3)}...`
    : value
}
