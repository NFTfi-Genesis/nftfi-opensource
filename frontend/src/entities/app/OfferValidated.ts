import { OfferStatus, OfferIvalidReasons } from 'src/entities/domain/Offer'

export type OfferValidated = {
  status: OfferStatus.Active
} | {
  status: OfferStatus.Invalid
  invalidReason: OfferIvalidReasons
}
