# Wrappers

## Purpose

Wrappers abstract NFT transfer, approval, ownership, and balance behavior behind one protocol interface:

- `INftWrapper`

Main files:

- `contracts/nftTypeRegistry/nftTypes/ERC721Wrapper.sol`
- `contracts/nftTypeRegistry/nftTypes/ERC721LegacyWrapper.sol`
- `contracts/nftTypeRegistry/nftTypes/ERC1155Wrapper.sol`
- `contracts/nftTypeRegistry/nftTypes/CryptoKittiesWrapper.sol`
- `contracts/nftTypeRegistry/nftTypes/PunkWrapper.sol`
- `contracts/nftTypeRegistry/nftTypes/SuperRareV1Wrapper.sol`

The protocol uses wrappers by `delegatecall` from loan and escrow contracts, so wrapper logic executes in the caller's context.

## Why Wrappers Exist

NFTfi cannot assume all collateral looks like standard modern ERC721.

The wrapper layer handles differences such as:

- safe vs legacy ERC721 transfer
- ERC1155 balance and approval semantics
- CryptoPunks market-style transfer flow
- CryptoKitties custom transfer function
- SuperRare V1 push-only transfer behavior

Without wrappers, the loan and escrow contracts would be full of collection-specific branching and much harder to reason about.

## Common Interface Responsibilities

Each wrapper implements:

- `transferNFT`
- `approveNFT`
- `isOwner`
- `balanceOf`

That gives the rest of the protocol a normalized way to:

- move collateral
- check ownership
- prepare handovers between escrow contexts
- detect whether personal escrow already holds spare balance

## Wrapper Variants

### `ERC721Wrapper`

- uses `safeTransferFrom`
- standard approval model
- standard single-token ownership semantics

### `ERC721LegacyWrapper`

- uses plain `transferFrom`
- useful for collections that do not cooperate with safe transfer expectations

### `ERC1155Wrapper`

- always transfers amount `1`
- treats supported ERC1155 collateral as a one-unit collateral position even though the token standard can be fungible
- balance checks return the actual token balance for the id

This has an important implication: ERC1155 support here is operationally "one unit of an id per loan".

### `CryptoKittiesWrapper`

- supports CryptoKitties custom `transfer` / `transferFrom`
- ownership and approval follow kitty-specific interfaces

### `PunkWrapper`

- handles CryptoPunks market mechanics
- if sender is the wrapper context itself, it uses `transferPunk`
- otherwise it requires current ownership and uses `buyPunk`

This is one of the strongest examples of why wrappers are necessary.

### `SuperRareV1Wrapper`

- only supports push transfer from the wrapper context itself
- does not support approval and will revert on `approveNFT`

This means not every wrapper supports every path equally. Some flows must adapt to collection-specific limits.

## Protocol Consequences

### Wrapper correctness is security-critical

Because wrappers are `delegatecall`ed from custody and loan contracts, bugs in wrappers are not isolated helper bugs. They affect core protocol execution.

### NFT type choice is behavior choice

When a collection is assigned an NFT type in the permitted registry, that assignment selects its runtime custody behavior.

### Personal escrow depends on wrapper `balanceOf` and `approveNFT`

The personal escrow optimizations and handover flow rely directly on wrapper support for these operations.

## What To Read Next

- [Permitted NFTs And Type Registry](./permitted-nfts-and-type-registry.md)
- [Escrow And Custody](../escrow/README.md)
