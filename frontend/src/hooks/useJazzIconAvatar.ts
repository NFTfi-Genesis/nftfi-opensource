import { useEffect } from 'react'
import jazzicon from 'jazzicon'
import { Address } from 'src/entities/base/Address'

const addressToSeed = (address: Address): number => {
  return parseInt(address.slice(2, 10), 16)
}

export function generateJazzIconAvatar(address: Address, diameter: number) {
  const seed = addressToSeed(address)
  const icon = jazzicon(diameter, seed)
  return icon
}

export function useJazzIconAvatar(ref: React.RefObject<HTMLDivElement>, address: Address, diameter: number) {
  useEffect(() => {
    if (address && ref.current) {
      const icon = generateJazzIconAvatar(address, diameter)

      ref.current.innerHTML = ''
      ref.current.appendChild(icon)
    }
  }, [address, diameter, ref])
}
