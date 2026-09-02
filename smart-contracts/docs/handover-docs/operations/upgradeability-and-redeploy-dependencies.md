# Upgradeability And Redeploy Dependencies

This repo is not proxy-upgradeable in the normal production-contract sense.

The operational upgrade model is:

- deploy a new contract version
- rewire registries or hub entries where possible
- transfer ownership
- accept ownership on the destination Safe
- leave old contract state in place unless there is an explicit migration path

The main exception is the personal-escrow clone model:

- `PersonalEscrowFactory` deploys minimal-proxy clones of `PersonalEscrow`
- those clones are not upgraded in place when a new implementation is deployed

## Upgrade Blast Radius Levels

Use this rough scale when planning changes:

- low: can usually be upgraded by deploying a replacement and changing a registry or hub entry
- medium: requires redeploy plus some rewiring, but existing state can usually keep operating
- high: existing live state and multiple downstream contracts are affected
- very high: upgrade touches loan identity, note identity, or core hub wiring and should be treated like a protocol migration

## General Rules

### 1. Linked library changes force redeploy of dependents

If a contract is linked against a library at deploy time, changing that library means redeploying the dependent contract.

In this repo that especially matters for:

- `NFTfiSigningUtils`
- `LoanChecksAndCalculations`
- `ContractKeys`
- `ContractKeyUtils`

### 2. Hub-based lookups reduce some redeploy pressure

Many contracts read dependencies through `NftfiHub` at runtime.

If the interface stays compatible, changing the hub entry can avoid redeploying every caller.

That is why some support-contract upgrades are cheaper than loan or coordinator upgrades.

### 3. State-heavy contracts are much more expensive to upgrade

Anything that owns loan identity, note identity, or live collateral state has a much larger blast radius than a stateless adapter or registry contract.

## Contract-By-Contract Analysis

### `NftfiHub`

Upgrade difficulty: `very high`

Hard redeploy dependencies:

- linked `ContractKeyUtils`
- its own registry logic and storage layout

Why it is expensive:

- most core contracts store the hub address immutably in the constructor
- if the hub address changes, those contracts do not automatically follow the new hub

Operational consequence:

- changing hub logic is close to a protocol-wide migration
- a new hub usually implies redeploying every contract with an immutable hub pointer

### `ContractKeys`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- `Escrow`
- `PersonalEscrow`
- `Refinancing`
- loan contracts in current deploy flow

Why:

- it is a linked library dependency, not just runtime data

Operational consequence:

- changing contract-key constants or the linked library implementation creates a broad redeploy wave

### `ContractKeyUtils`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- `NftfiHub`
- `AssetOfferLoan`
- `CollectionOfferLoan`
- `LoanCoordinator`
- `PermittedNFTsAndTypeRegistry`
- `Refinancing`
- `DelegateCashPlugin`

Operational consequence:

- this utility sits in too many linked places to treat as a small change

### `NFTfiSigningUtils`

Upgrade difficulty: `medium` by itself, `high` for the loan stack

Hard redeploy dependencies:

- `AssetOfferLoan`
- `CollectionOfferLoan`
- `NFTfiSigningUtilsContract`

Operational consequence:

- if signature hashing or validation logic changes, both loan contracts must be redeployed
- after redeploying the loan contracts, `LoanCoordinator` offer-type registration and refinance target addresses must be reviewed and updated

This is one of the clearest examples of a utility change causing a loan-contract redeploy.

### `LoanChecksAndCalculations`

Upgrade difficulty: `medium` by itself, `high` for the loan stack

Hard redeploy dependencies:

- `AssetOfferLoan`
- `CollectionOfferLoan`

Operational consequence:

- payoff math, admin fee logic, and similar calculation changes force loan-contract redeploys

### `AssetOfferLoan`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- linked `NFTfiSigningUtils`
- linked `LoanChecksAndCalculations`
- linked `ContractKeys`
- linked `ContractKeyUtils`
- immutable hub address
- constructor-seeded permitted ERC20 list

Dynamic dependencies that can be rewired:

- `LoanCoordinator` is read through the hub
- escrow, personal escrow factory, permitted NFTs, ERC20 transfer manager, and delegate plugin are hub-driven at runtime

What must be updated after redeploy:

- `LoanCoordinator` offer-type registration
- `NftfiHub` entries that point to the active contract set, especially the `PERMITTED_ERC20S` key used in setup
- `Refinancing` target loan contract if refinance should originate into the new asset-loan contract

Operational consequence:

- a loan-contract redeploy is not isolated
- it fans out into coordinator registration, hub wiring, and often refinancing target updates

### `CollectionOfferLoan`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- linked `NFTfiSigningUtils`
- linked `LoanChecksAndCalculations`
- linked `ContractKeys`
- linked `ContractKeyUtils`
- immutable hub address
- constructor-seeded permitted ERC20 list

Dynamic dependencies that can be rewired:

- same general hub-driven dependencies as `AssetOfferLoan`

What must be updated after redeploy:

- `LoanCoordinator` offer-type registration
- `Refinancing` target collection-offer contract if refinance should originate into the new collection-loan contract

Operational consequence:

- same upgrade class as `AssetOfferLoan`

### `LoanCoordinator`

Upgrade difficulty: `very high`

Hard redeploy dependencies:

- immutable hub address
- linked `ContractKeyUtils`
- constructor-registered loan contract set
- one-time `initialize()` call for note addresses

Why this is one of the most expensive upgrades:

- it owns loan identity
- it owns live loan status for every loan id
- it owns the link between loans and SmartNFT ids
- multiple other contracts use it indirectly through the hub for authorization or metadata

Downstream dependencies affected by a coordinator change:

- `AssetOfferLoan`
- `CollectionOfferLoan`
- `Escrow`
- `ERC20TransferManager`
- `DelegateCashPlugin`
- `Refinancing`
- `PromissoryNote`
- `ObligationReceipt`

Important nuance:

- loan contracts can follow a new coordinator through the hub
- but old loans and old note mappings do not migrate automatically into a new coordinator

Operational consequence:

- coordinator upgrades are closer to protocol migration events than routine redeploys
- if the coordinator changes, note contracts and historical loan-state continuity need explicit handling

This is the main case where “anything the coordinator depends on is an even greater upgrade” is true in practice.

### `PromissoryNote` and `ObligationReceipt`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- immutable hub address
- constructor-granted `LOAN_COORDINATOR_ROLE`
- constructor-set name, symbol, and base URI

What can be changed without redeploy:

- additional loan coordinators can be granted `LOAN_COORDINATOR_ROLE`
- base URI can be changed by `BASE_URI_ROLE`

Important nuance:

- if a new coordinator is introduced, the note contracts can be granted the new role
- but the old notes already reference their original coordinator and loan ids in stored metadata

Operational consequence:

- note upgrades are tightly coupled to coordinator strategy
- a clean coordinator migration often implies a note-contract strategy decision too

### `Escrow`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- immutable hub address
- linked `ContractKeys`
- internal collateral-lock state

Dynamic dependencies that can be rewired:

- loan authorization is checked through the hub-selected `LoanCoordinator`
- wrapper behavior is supplied by the wrapper address stored in each loan
- plugins can be added or removed by owner action

Operational consequence:

- changing escrow logic requires redeploy and hub rewiring
- changing wrappers does not require escrow redeploy, but existing live loans keep the wrapper address stored in their loan terms

That last point matters:

- updating a wrapper in the permit registry affects new loans
- existing live loans still point at the wrapper captured when the loan was created

### `PersonalEscrow`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- immutable hub address
- linked `ContractKeys`
- clone-based deployment model

Why it is special:

- new logic means a new implementation contract
- existing personal-escrow clones do not upgrade in place

Operational consequence:

- upgrading personal escrow is not just “deploy a new implementation”
- it implies a new-factory question and a migration story for users with old clones

### `PersonalEscrowFactory`

Upgrade difficulty: `high`

Hard redeploy dependencies:

- immutable `personalEscrowImplementation` address

What this means:

- if `PersonalEscrow` implementation changes, the factory must also change for new clones to use the new implementation

Operational consequence:

- existing personal escrows stay on old code
- new factory deployment must be wired into `NftfiHub`

### `ERC20TransferManager`

Upgrade difficulty: `medium`

Hard redeploy dependencies:

- immutable hub address
- escrowed payback balances stored in the contract

Dynamic dependencies that can be rewired:

- loan authorization follows the coordinator selected in the hub

Operational consequence:

- if only the coordinator address changes and the interface remains compatible, manager redeploy is not automatically required
- if transfer-manager logic changes, redeploy plus hub rewiring is required, and escrowed repayment state needs attention

### `PermittedNFTsAndTypeRegistry`

Upgrade difficulty: `medium`

Hard redeploy dependencies:

- linked `ContractKeyUtils`

What can already change without redeploy:

- NFT permits
- nft-type to wrapper mappings

Operational consequence:

- many support-list and wrapper-address changes are pure admin operations, not redeploys
- only logic changes in the registry itself force redeploy

This contract is comparatively cheap to operate because most day-to-day changes are data changes, not code changes.

### NFT wrappers

Upgrade difficulty: `low` to `medium`

Hard redeploy dependencies:

- none across the full protocol, as long as the wrapper interface stays compatible

What can usually be done:

- deploy a new wrapper
- point the NFT type registry at the new wrapper

Important nuance:

- live loans store the chosen wrapper address in `LoanTerms`
- so wrapper upgrades normally affect only new loans

Operational consequence:

- wrapper upgrades are relatively cheap compared with loan or coordinator upgrades

### `Refinancing`

Upgrade difficulty: `medium`

Hard redeploy dependencies:

- immutable hub address
- linked `ContractKeys`
- linked `ContractKeyUtils`
- constructor-set flashloan and swap stack

Dependencies that can be updated in place:

- refinanceable type to adapter mapping through `setRefinanceableType`
- refinanceable contract to type mapping through `setRefinanceableContract`
- target loan offer contract through `setTargetLoanOfferContract`
- target collection-offer contract through `settargetLoanCollectionOfferContract`
- flashloan fee
- supported token swap fee rates

Why its blast radius is smaller than the loan stack:

- it does not own the core loan-id registry
- much of its adapter and target wiring is owner-settable

Operational consequence:

- core refinancing logic changes still require redeploy
- but many adapter and target-loan updates can be done in place

This is why refinancing is a materially easier upgrade surface than the loan/coordinator stack.

### Refinancing adapters

Upgrade difficulty: `low`

Typical dependencies:

- mostly stateless or narrowly scoped adapter logic
- registered into `Refinancing` through the adapter registry

Operational consequence:

- adapter upgrades are usually “deploy new adapter, update registry”
- they generally do not force a `Refinancing` redeploy unless the adapter interface or core assumptions change

### `DelegateCashPlugin`

Upgrade difficulty: `medium`

Hard redeploy dependencies:

- immutable hub address
- linked `ContractKeyUtils`
- constructor-set delegate.cash registry address

Dynamic dependencies:

- uses hub-selected escrow and coordinator at runtime
- can be swapped operationally by deploying a new plugin, adding it in escrow, and updating the hub key

Operational consequence:

- plugin changes are much cheaper than escrow or coordinator changes
- but rollout still requires both escrow plugin management and hub rewiring

## Practical Upgrade Sequences

### If `NFTfiSigningUtils` changes

Minimum likely sequence:

1. redeploy `AssetOfferLoan`
2. redeploy `CollectionOfferLoan`
3. update `LoanCoordinator` offer-type registration if needed
4. update `Refinancing` target loan addresses if refinance should point to the new loan contracts
5. update hub wiring and ownership as needed

### If a loan contract changes

Minimum likely sequence:

1. deploy the new loan contract
2. register or switch the offer type in `LoanCoordinator`
3. consider disabling the old loan contract for new originations
4. update `Refinancing` target contract address for that loan type
5. verify hub entries and ownership

### If `LoanCoordinator` changes

Treat it like a migration event:

1. deploy new coordinator
2. decide note strategy for `PromissoryNote` and `ObligationReceipt`
3. update hub `LOAN_COORDINATOR`
4. verify escrow, transfer manager, delegate plugin, and refinancing still authorize correctly
5. explicitly decide how old loans and note mappings are handled

### If `Refinancing` changes

Minimum likely sequence:

1. deploy new `Refinancing`
2. register adapters and refinanceable contracts
3. set target loan contracts
4. update hub `REFINANCING`
5. transfer ownership

## Short Version

- utility-library changes can have a wide redeploy blast radius
- loan-contract changes are expensive because they fan out into coordinator and refinancing wiring
- coordinator changes are the most operationally expensive
- wrapper and adapter changes are comparatively cheap
- refinancing is much easier to upgrade than the main loan/coordinator stack because more of its wiring is owner-settable
