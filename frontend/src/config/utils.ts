import { z } from 'zod'
import { Address } from 'src/entities/base/Address'

export const zAddress = () => z.string().transform(address => address.toLowerCase() as Address)
