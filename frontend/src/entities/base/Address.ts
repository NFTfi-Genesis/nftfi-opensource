import { Branded } from 'src/typesUtils'

export type Address = Branded<`0x${string}`, 'Address'>
