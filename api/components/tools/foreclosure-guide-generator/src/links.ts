/** Builders for the external links lenders follow to inspect collateral and trigger foreclosure. */

/** OpenSea item page for an Ethereum-mainnet NFT, e.g. `.../item/ethereum/0xabc.../1234`. */
export const buildOpenseaAssetUrl = (nftContract: string, nftTokenId: string): string =>
  `https://opensea.io/item/ethereum/${nftContract.toLowerCase()}/${nftTokenId}`;

/**
 * Etherscan "Write Contract" tab of the loan contract, deep-linked to the `liquidateOverdueLoan`
 * function when its Etherscan function index is known (e.g. `#writeContract#F9`). The contract
 * address is kept in its checksummed form, matching the legacy foreclosures page.
 */
export const buildEtherscanForeclosureUrl = (loanContract: string, functionAnchor: string | null): string => {
  const base = `https://etherscan.io/address/${loanContract}#writeContract`;
  return functionAnchor ? `${base}#${functionAnchor}` : base;
};
