export enum EmailSubject {
  OffersSummaryBorrower = 'NFTfi: Offers summary',
  OfferBorrower = 'NFTfi: You have received the first loan offer on a newly listed asset',
  OfferRefiBorrower = 'NFTfi: You have received a loan refinancing offer'
}

export interface ServiceConfig {
  nftfiUrl: string;
}
