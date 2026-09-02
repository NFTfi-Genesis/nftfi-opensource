# Global Escrow

## Purpose

`Escrow` is the protocol-wide collateral custodian used when a borrower does not have a personal escrow selected for the loan.

Main files:

- `contracts/escrow/Escrow.sol`
- `deploy/003_deploy_Escrow.ts`

It is the custody layer that loan contracts call into for:

- locking collateral
- unlocking collateral
- handing a collateral lock from one loan contract to another
- plugin-based external calls

## Core Model

The contract tracks collateral in two related ways:

- `_tokensLockedByLoan[nft][id][loan]`
- `_escrowTokens[nft][id]`

Interpretation:

- `_tokensLockedByLoan` tracks which loan contract currently controls a given collateral position
- `_escrowTokens` tracks whether a token is serving as collateral at all, which is later used to block owner drain paths

That means the global escrow is not just a vault. It is also the protocol's lock-accounting layer for collateral ownership by loan contract.

## Access Model

### `onlyLoan`

The contract trusts only registered loan contracts for lock actions.

The check is:

- query `LoanCoordinator` through the hub
- require `getTypeOfLoanContract(msg.sender) != bytes32(0)`

Implication:

- if a malicious or wrong address were ever registered as a loan contract in the coordinator, that address would gain custody power over approved collateral

So escrow safety depends on correct coordinator registration, not just escrow ownership.

### `onlyLockingLoan`

Unlock and handover operations require that the calling loan contract currently owns the lock record for that token id.

This prevents one registered loan contract from arbitrarily taking over collateral locked by another one.

## Main Flows

### Locking collateral

`lockCollateral`:

1. records the lock in storage
2. transfers the NFT from borrower to escrow via wrapper `delegatecall`
3. emits `Locked`

The wrapper abstraction is critical here. `Escrow` itself does not know how to move CryptoKitties, Punks, ERC1155, or legacy ERC721s directly.

### Unlocking collateral

`unlockCollateral`:

1. checks the caller currently owns the lock
2. decrements lock storage
3. transfers the NFT out through the wrapper
4. emits `Unlocked`

### Loan handover

`handOverLoan` moves the lock record from one loan contract to another without moving the NFT.

This is an important primitive for refinance or migration flows where custody stays in the escrow, but controlling loan context changes.

## Wrapper Dependence

Like the loan layer, `Escrow` uses wrapper `delegatecall` for:

- transfer
- ownership checks

That means wrapper correctness is part of custody correctness.

The escrow contract is intentionally thin on collection-specific logic and delegates NFT semantics outward.

## Owner Recovery And Drain Paths

`Escrow` contains multiple owner-only recovery paths:

- `drainERC20Airdrop`
- `withdrawNFT`
- `drainNFT`

These are constrained by `_escrowTokens` so the owner cannot use them to remove currently locked collateral.

Important nuance:

- `drainERC20Airdrop` includes a defensive check against tokens whose interface could resemble NFT transfer semantics, such as CryptoKitties-style `transfer(address,uint256)`
- `withdrawNFT` uses the permitted NFT registry to find the wrapper for a token contract
- `drainNFT` lets the owner specify an NFT type string directly to choose a wrapper

These are operational escape hatches, not normal loan-path functions.

## Plugin Surface

`Escrow` supports owner-approved plugins through:

- `addPlugin`
- `removePlugin`
- `pluginCall`

`pluginCall` lets a registered plugin trigger an arbitrary call from the escrow to a target contract.

This is the highest-risk extension point in the custody layer because:

- plugins can potentially move or reconfigure collateral
- the contract comments explicitly warn about the security implications

The main plugin currently relevant in this repo is the delegate-cash plugin.

## What This Means Operationally

- the global escrow is a central protocol trust surface
- coordinator registration controls who can lock and unlock
- wrapper correctness controls whether custody operations behave correctly for each NFT type
- plugin permissions are effectively privileged custody powers

## What To Read Next

- [Personal Escrow](./personal-escrow.md)
- [ERC20 Transfer Manager](./erc20-transfer-manager.md)
- [NFT Support](../nft-support/README.md)
