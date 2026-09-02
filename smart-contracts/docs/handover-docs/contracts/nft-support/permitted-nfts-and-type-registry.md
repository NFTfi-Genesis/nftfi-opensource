# Permitted NFTs And Type Registry

## Purpose

`PermittedNFTsAndTypeRegistry` is the protocol registry that decides:

- whether a collection is supported as collateral
- which NFT type that collection belongs to
- which wrapper implementation should be used for that type

Main files:

- `contracts/permittedLists/PermittedNFTsAndTypeRegistry.sol`
- `deploy/007_deploy_PermittedNFTs.ts`

This is the core NFT gating layer used by loan contracts and escrow.

## Two Linked Registries In One Contract

The contract stores:

- `nftPermits`: collection address -> nft type key
- `nftTypes`: nft type key -> wrapper address

That means collection support is a two-step resolution:

1. collection address resolves to an NFT type
2. NFT type resolves to a wrapper

This is why loan and escrow code can simply ask for `getNFTWrapper(collection)` rather than maintaining per-collection transfer logic.

## Key Behaviors

### Collection permit management

Owner functions:

- `setNFTPermit`
- `setNFTPermits`

Behavior:

- zero address collection is rejected
- non-empty NFT type must already be registered
- empty string disables the permit by storing zero type

### NFT type management

Owner functions:

- `setNftType`
- `setNftTypes`

Behavior:

- NFT type string cannot be empty
- wrapper may be updated or zeroed
- string keys are converted with `ContractKeyUtils`, so this follows the same fixed-width-string model as the hub

## Runtime Consumers

The main consumers are:

- `LoanBaseMinimal._getWrapper`
- `Escrow.withdrawNFT`
- `Escrow.drainNFT`
- any other custody path that needs a wrapper

If a collection is not permitted, wrapper resolution returns zero and origination sanity checks fail.

## Deployment Behavior

The deployment script does more than deploy the contract.

It also:

- reads `deploy/config/permittedList.<network>.json`
- registers a base set of NFT types and wrappers
- seeds an initial deployment batch of permitted collections
- applies post-deployment batches afterward
- reuses existing mainnet deployment and a legacy goerli deployment branch in some network cases

That means the live permit set is partly constructor-initialized and partly post-deploy mutated.

## Important Behavioral Notes

### This is both allowlist and type registry

The current contract combines two responsibilities that could have been separate.

### Empty type means unsupported

A collection with zero type key is treated as not permitted.

### Wrapper availability gates support

You cannot safely permit a collection under a type that has no registered wrapper.

## What To Read Next

- [Wrappers](./wrappers.md)
- [Global Escrow](../escrow/global-escrow.md)
