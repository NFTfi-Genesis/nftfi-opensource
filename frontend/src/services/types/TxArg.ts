import { Wei } from 'src/entities/base/Wei'
import { Address } from 'src/entities/base/Address'

type TxPrimitiveArg = string | number | boolean | Wei

type TxBytesLike = `0x${string}` | Uint8Array

type TxArgArray = Array<TxArg>

// objects for tuples/structs: { foo: Arg, bar: Arg }
interface TxArgObject {
  [key: string]: TxArg
}

export type TxArg
  = | TxPrimitiveArg
  | Address
  | TxBytesLike
  | TxArgObject
  | TxArgArray
