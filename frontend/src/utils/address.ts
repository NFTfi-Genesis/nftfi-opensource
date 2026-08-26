import { isAddress } from 'viem'
import { Address } from 'src/entities/base/Address'

export function isEnsName(value: string): boolean {
  return value.endsWith('.eth')
}

export function isEthAddress(value: string): value is Address {
  // TODO: Consider other fn isValidEthereumAddress and implemetn with regex? remove viem dependency
  return isAddress(value)
}

export function isZeroAddress(address: Address): boolean {
  return address === '0x0000000000000000000000000000000000000000' as Address
}
