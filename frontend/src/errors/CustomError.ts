import { BaseError, BaseErrorParams } from 'src/errors/BaseError'
import { JSONObject, Overwrite } from 'src/typesUtils'
import { TKey } from 'src/modules/translation/TKey'

export type CustomErrorParams = Overwrite<BaseErrorParams, {
  name: string
  tKey: TKey
  details: JSONObject
}>

// Customizable error class for errors that don't fit the standard error hierarchy.
export class CustomError extends BaseError {
  constructor(params: CustomErrorParams) {
    super(params)
    this.name = params.name
  }

  override getName(): string {
    return this.name
  }

  override getDefaultTKey(): TKey {
    return this.tKey
  }
}
