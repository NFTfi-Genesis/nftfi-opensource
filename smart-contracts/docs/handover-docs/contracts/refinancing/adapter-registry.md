# Adapter Registry

## Purpose

`RefinancingAdapterRegistry` maps refinanceable contracts to adapter implementations.

Main files:

- `contracts/refinancing/refinancingAdapters/RefinancingAdapterRegistry.sol`
- `contracts/refinancing/refinancingAdapters/IRefinancingAdapter.sol`

This registry is the refinement layer that tells `Refinancing`:

- what kind of old position a contract represents
- which adapter should handle that position

## Two Linked Mappings

The registry stores:

- `refinanceableTypes`: refinanceable type -> adapter
- `refinanceableContracts`: concrete contract address -> refinanceable type

That means resolution is two-step:

1. old contract address resolves to a refinanceable type
2. refinanceable type resolves to an adapter

This mirrors the NFT permit + wrapper structure elsewhere in the protocol.

## Interface Contract

Each adapter must implement:

- `getBorrowerAddress`
- `transferBorrowerRole`
- `payOffRefinancable`
- `getCollateral`
- `getPayoffDetails`

That interface defines the minimum protocol-independent facts the refinancing coordinator needs.

## Admin Surface

Owner functions:

- `setRefinanceableContract`
- `setRefinanceableContracts`
- `setRefinanceableType`
- `setRefinanceableTypes`

Important constraints:

- refinanceable type string cannot be empty when registering a live type
- refinanceable contract cannot be zero address
- a non-empty type must already have a registered adapter

An empty type disables a previously registered refinanceable contract.

## Why This Exists

Without the registry, `Refinancing` would need hardcoded branches for every refinanceable protocol and version.

The registry gives the protocol:

- protocol-agnostic orchestration in `Refinancing`
- per-protocol logic in adapters
- post-deploy extensibility for new refinanceable contracts and versions

## Important Behavioral Notes

### Concrete contract addresses matter

The registry does not reason about an abstract protocol alone. It maps specific contract addresses to types.

That is why deployment scripts explicitly register:

- current NFTfi loan contracts
- specific legacy NFTfi contract addresses
- specific third-party protocol contract addresses

### Type naming follows repo-local fixed-width string conventions

Like the hub and NFT registries, this registry uses `ContractKeyUtils` fixed-width string conversion, not hashed identifiers.

## What To Read Next

- [Refinancing Core](./refinancing-core.md)
- [NFTfi Adapters](./nftfi-adapters.md)
- [External Adapters](./external-adapters.md)
