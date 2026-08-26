import { z } from 'zod'
import { zAddress } from './utils'

export const testNftsSchema = z.array(z.object({
  owner: zAddress(),
  nfts: z.array(z.object({
    address: zAddress(),
    id: z.string(),
  })),
}))
