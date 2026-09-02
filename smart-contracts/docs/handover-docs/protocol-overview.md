# Protocol Overview

This page is the shortest path to the active protocol model.

For implementation details, follow the contract links. If any higher-level description disagrees with the Solidity, the Solidity wins.

## Core Shape

NFTfi in this repository is organized around a few tightly connected modules:

- [NftfiHub and contract keys](./contracts/hub-and-registry.md) provide address discovery for the rest of the system.
- [Loan origination contracts](./contracts/loan-origination/README.md) create and manage loans using shared base logic plus offer-type-specific rules.
- [LoanCoordinator and Smart NFTs](./contracts/loan-coordinator-and-smart-nfts.md) turn each loan into transferable lender and borrower note positions.
- [Escrow and custody contracts](./contracts/escrow/README.md) hold collateral and support both protocol-level and personal-escrow custody paths.
- [Permitted NFT and wrapper infrastructure](./contracts/nft-support/README.md) determines what collateral forms are supported and how non-standard NFTs are normalized.
- [Refinancing contracts and adapters](./contracts/refinancing/README.md) allow live loans to be replaced or migrated through NFTfi-native or external adapter flows.

## Main Actors

- borrower: pledges collateral and receives principal
- lender: funds the loan and receives the lender-side note
- protocol owner and admins: manage registry entries, permitted lists, ownership handoff, and related operational controls
- refinancing adapter contracts: translate external marketplace or older NFTfi loan state into the current refinancing surface

## Loan Lifecycle

At a high level:

1. The loan contract validates an offer, signatures, nonces, and permit-list requirements.
2. Collateral is moved into escrow, either the shared escrow or a personal escrow path.
3. Principal movement is handled through the ERC20 transfer layer.
4. `LoanCoordinator` mints a lender-side promissory note and a borrower-side obligation receipt.
5. Repayment burns the active loan state and returns collateral through the custody layer.
6. Default enables collateral recovery for the lender-side position.
7. Refinancing can replace the active loan without a clean close-and-reopen cycle.

The base flow details live in:

- [Base Loan Stack](./contracts/loan-origination/base-loan-stack.md)
- [Asset Offer Loan](./contracts/loan-origination/asset-offer-loan.md)
- [Collection Offer Loan](./contracts/loan-origination/collection-offer-loan.md)

## Custody Model

Escrow is one of the most important protocol pieces.

The main custody split is:

- global escrow for standard protocol-held collateral paths
- personal escrow for user-specific custody contexts that still plug into the same broader loan machinery

Supporting pages:

- [Global Escrow](./contracts/escrow/global-escrow.md)
- [Personal Escrow](./contracts/escrow/personal-escrow.md)
- [ERC20 Transfer Manager](./contracts/escrow/erc20-transfer-manager.md)

## Note System

Each live loan is paired with SmartNFT-based note positions:

- `PromissoryNote` tracks the lender-side claim
- `ObligationReceipt` tracks the borrower-side position

That separation matters because note transferability changes who controls repayment, collateral claims, and refinance permissions.

See [Loan Coordinator And Smart NFTs](./contracts/loan-coordinator-and-smart-nfts.md).

## Registry And Wiring

The protocol is wired through contract-key lookup rather than hardcoded addresses throughout the system.

That means operational correctness depends heavily on:

- correct `NftfiHub` setup
- correct contract-key constants and key derivation
- correct deployment sequencing and post-deploy setup

See [Hub And Registry](./contracts/hub-and-registry.md).

## Refinancing Model

Refinancing sits on top of the active-loan model rather than replacing it.

The refinancing layer:

- reads current loan state
- validates a replacement path
- coordinates payoff and handover
- optionally uses adapter contracts to bridge NFTfi versions or external protocols

See:

- [Refinancing Core](./contracts/refinancing/refinancing-core.md)
- [Adapter Registry](./contracts/refinancing/adapter-registry.md)
- [NFTfi Adapters](./contracts/refinancing/nftfi-adapters.md)
- [External Adapters](./contracts/refinancing/external-adapters.md)

## Mainnet Inventory

The top-level [README](../../README.md) points to the Mainnet contract manifest.

## Important Boundaries

- `contracts/` is the protocol source of truth.
- `deploy/` explains how the system is assembled, but not the final behavior on its own.
- `deployments/mainnet/` records the published Mainnet addresses and compiler inputs.
- `test/` shows intended and regression-tested behavior, but if a test and contract disagree, inspect the contract first.
