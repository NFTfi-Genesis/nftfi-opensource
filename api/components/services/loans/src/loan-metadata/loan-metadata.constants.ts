// TODO: Update with actual static image URLs when available
export const OBLIGATION_IMAGE_URL = 'https://app.nftfi.com/ns/assets/placeholder.png';
export const PROMISSORY_IMAGE_URL = 'https://app.nftfi.com/ns/assets/placeholder.png';

export enum SmartNftType {
  Obligation = 'obligation',
  Promissory = 'promissory'
}

export const DESCRIPTIONS: Record<SmartNftType, string> = {
  [SmartNftType.Obligation]:
    'This obligation receipt is issued by https://nftfi.com and represents the rights to underlying NFT collateral of this loan if the borrower pays it back in time.',
  [SmartNftType.Promissory]:
    'This promissory note is issued by https://nftfi.com and represents the rights to either the principal plus interest, or the underlying NFT collateral of this loan if the borrower does not pay back in time.'
};

/**
 * Maps config keys under ethereum.contracts.nftfi to human-readable contract names.
 * Used to resolve contract address → contract name for the metadata attributes.
 */
export const CONFIG_KEY_TO_CONTRACT_NAME: Record<string, string> = {
  loanV1Fixed: 'v1.loan.fixed',
  loanV2Fixed: 'v2.loan.fixed',
  loanV2FixedCollection: 'v2.loan.fixed.collection',
  loanV21Fixed: 'v2-1.loan.fixed',
  loanV23Fixed: 'v2-3.loan.fixed',
  loanV23FixedCollection: 'v2-3.loan.fixed.collection',
  loanV3Asset: 'v3.assetOfferLoan.v1',
  loanV3Collection: 'v3.collectionOfferLoan.v1'
};
