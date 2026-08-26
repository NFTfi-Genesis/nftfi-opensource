import { Wei } from 'src/entities/base/Wei'

export function isMaxAllowance(allowance: Wei) {
  const cap = 10n ** 28n
  return allowance >= cap
}

export function isZeroAllowance(allowance: Wei) {
  return allowance === 0n
}
