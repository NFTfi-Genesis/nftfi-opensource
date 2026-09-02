# Hub And Registry

## Purpose

The hub and contract-key layer gives the protocol a central address registry. Core contracts do not hardcode every dependency address directly. Instead, many of them keep a reference to `NftfiHub` and resolve other protocol contracts by key at runtime.

This is the first contract layer to understand because it defines how the rest of the protocol finds shared services such as:

- permitted NFT registry
- loan coordinator
- escrow
- personal escrow factory
- ERC20 transfer manager
- delegate plugin

Main contracts and libraries:

- `contracts/NftfiHub.sol`
- `contracts/utils/ContractKeys.sol`
- `contracts/utils/ContractKeyUtils.sol`
- `contracts/interfaces/INftfiHub.sol`

## Main Components

### `NftfiHub`

`NftfiHub` is a simple owner-controlled registry from `bytes32` keys to addresses.

Core behavior:

- stores `mapping(bytes32 => address) contracts`
- owner can set one or many entries
- anyone can read entries with `getContract(bytes32)`
- emits `ContractUpdated` when a key is changed

Important properties:

- there is no built-in validation that a registered address implements a specific interface
- the hub is only as safe as its owner and deployment/wiring process
- dependent contracts trust the returned address and often call it immediately

That means the hub is a critical trust point. If a bad address is registered for a key, downstream contracts can misbehave or become unsafe.

### `ContractKeys`

`ContractKeys` defines the shared canonical keys used by the protocol. In the current repo, the library exposes constants for:

- `PERMITTED_ERC20S`
- `PERMITTED_NFTS`
- `NFT_TYPE_REGISTRY`
- `LOAN_COORDINATOR`
- `PERMITTED_SNFT_RECEIVER`
- `ESCROW`
- `ERC20_TRANSFER_MANAGER`
- `PERSONAL_ESCROW_FACTORY`
- `DELEGATE_PLUGIN`

Operationally, the important point is that these keys are plain `bytes32("...")` constants, not hashes. Other contracts use the exact same representation when reading from the hub.

### `ContractKeyUtils`

`ContractKeyUtils.getIdFromStringKey(string)` converts a string key into the `bytes32` form used throughout the system.

Notable behavior:

- strings longer than 32 bytes revert with `invalid key`
- conversion is done by loading the first 32 bytes of the string
- it is effectively a fixed-width string representation, not `keccak256`

This matters because many code comments and older naming patterns loosely talk about "keys" as if they were hashed. In the active code path, they are not hashed. They are direct `bytes32` string values.

## How The Layer Works

### Write path

The owner calls:

- `setContract(string,address)`
- `setContracts(string[],address[])`

Internally, the hub:

1. converts string keys with `ContractKeyUtils`
2. writes the resolved `bytes32` key to storage
3. emits `ContractUpdated`

### Read path

Dependent contracts keep an immutable `INftfiHub` reference and resolve dependencies on demand, for example:

- loan contracts resolve the loan coordinator, permitted NFT registry, escrow, personal escrow factory, delegate plugin, and ERC20 transfer manager
- escrow resolves the loan coordinator
- other protocol components use hub lookups to avoid storing duplicate references

## Why This Design Exists

This registry design gives the protocol:

- central dependency wiring
- easier upgrades or replacements of shared components
- less constructor parameter sprawl in downstream contracts

It also creates a clear administrative boundary:

- ownership of the hub effectively controls protocol composition

## Admin And Trust Surface

`NftfiHub` inherits the repo's custom `Ownable`, not OpenZeppelin's default `Ownable`.

Relevant ownership model:

- owner is set in the constructor
- ownership transfer is two-step:
  - current owner calls `requestTransferOwnership`
  - candidate calls `acceptTransferOwnership`

This is operationally important because the deployment scripts later rely on this ownership-transfer flow rather than transferring ownership in one transaction.

## Important Constraints And Gotchas

### Keys are fixed-width strings, not hashes

A reader could easily assume keys are `keccak256` values. They are not. The key format must match the `bytes32("KEY")` / first-32-bytes string convention used in the contracts.

### Hub lookups are trusted

Downstream contracts do not generally validate hub results before use. Correct hub wiring is therefore a protocol prerequisite, not just a deployment detail.

### There is no versioning inside the hub

The hub only stores the current address for a key. Historical addresses or compatibility rules live outside the hub itself.

### Some constants may be broader than current usage

Not every constant in `ContractKeys` appears to be heavily used by the currently active contracts. The presence of a key constant does not guarantee it is a live dependency in every deployment path.

## What To Read Next

After the hub layer, the next useful step is the loan base layer:

- [Loan Origination](./loan-origination/README.md)

That is where the protocol starts turning registry lookups into loan lifecycle behavior.
