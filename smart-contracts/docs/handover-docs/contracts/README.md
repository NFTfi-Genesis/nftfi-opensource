# Contracts

This section documents the protocol from the contracts outward.

Coverage:

- [Hub And Registry](./hub-and-registry.md)
- [Loan Origination](./loan-origination/README.md)
- [Loan Coordinator And Smart NFTs](./loan-coordinator-and-smart-nfts.md)
- [Escrow And Custody](./escrow/README.md)
- [NFT Support](./nft-support/README.md)
- [Refinancing](./refinancing/README.md)

## Reading Order

For this repo, the most useful reading order is not alphabetical.

Start with:

1. [Hub And Registry](./hub-and-registry.md)
2. [Loan Origination](./loan-origination/README.md)

Then move on to coordinator, escrow, wrappers, and refinancing once those pages are added.

## Contract-First Rule

All pages in this section should be treated as explanations of the Solidity code under `contracts/`.

If a script, test, or older document disagrees with these pages, check the contract implementation first.

## Scope Boundaries

This documentation covers NFTfi-owned protocol modules.

It does not create standalone documentation for:

- imported OpenZeppelin contracts
- external dependency contracts

External dependencies should only be mentioned where they materially change the behavior of NFTfi protocol contracts.
