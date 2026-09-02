# Foundry Tests

The Foundry layer in this repo is smaller than the Hardhat layer, but it is still useful.

## What It Covers

The most visible Foundry files are:

- `test/BaseLoan.t.sol`
- `test/AssetOfferLoan.t.sol`
- `test/Fixture.t.sol`
- `test/NftfHub.t.sol`
- `test/PermitterNFTsAndTypeRegistry.t.sol`

The last two names intentionally mirror the current repo filenames, including the spelling as checked into the tree.

## Role Of `Fixture.t.sol`

`test/Fixture.t.sol` is the key Foundry scaffold.

It builds a local Solidity-side protocol fixture including:

- hub
- wrappers
- escrow and personal escrow
- ERC20 transfer manager
- asset and collection loan contracts
- permit registry
- loan coordinator and SmartNFTs
- delegate cash plugin
- refinancing plus adapters

This makes the Foundry tests useful for Solidity-native iterations and for validating local setup logic without going through the TypeScript fixture layer.

## Practical Importance

The Foundry layer should be viewed as:

- a complementary fast feedback path
- a Solidity-native harness for some core components
- not the primary documentation surface for protocol behavior

In practice, the Hardhat suite still explains more of the full end-to-end protocol behavior than the current Foundry coverage does.

## When To Use It

Use the Foundry tests when:

- iterating directly on Solidity logic
- validating low-level behavior quickly
- working inside the Solidity fixture model

Use the Hardhat suite when:

- changing user-facing flows
- changing deployment-integrated behavior
- changing wrappers, escrow, or refinance paths
