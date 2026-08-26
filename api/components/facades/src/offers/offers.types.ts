export enum OffersQueueTopic {
  AcceptRenegotiation = 'offers_accept-renegotiation',
  DeleteWinningOffer = 'offers_delete-winning-offer',
  InvalidateCache = 'offers_invalidate-cache'
}

export interface NftKey {
  nftContract: string;
  nftTokenId: string;
}

export interface AcceptRenegotiationPayload {
  loanId: string;
  contract: string;
}
export interface WinningOfferKey extends NftKey {
  lender: string;
  currency: string;
  principal: string;
  repaymentMax: string;
  duration: number;
}
