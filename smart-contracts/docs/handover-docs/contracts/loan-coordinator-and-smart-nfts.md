# Loan Coordinator And Smart NFTs

## Purpose

`LoanCoordinator` is the protocol component that turns a loan created by a loan contract into a tracked protocol object with optional transferable lender and borrower positions.

Main files:

- `contracts/loans/LoanCoordinator.sol`
- `contracts/interfaces/ILoanCoordinator.sol`
- `contracts/smartNft/SmartNft.sol`
- `deploy/008_deploy_DirectLoanCoordinator.ts`

This layer is responsible for:

- assigning loan ids
- tracking loan creator contract and status
- mapping offer types to loan contracts
- managing offer nonces by offer type
- minting and burning promissory notes and obligation receipts
- exposing the SmartNFT token addresses used by the protocol

## `LoanCoordinator`

### Core role

`LoanCoordinator` is not the contract that holds the detailed economic loan terms. Those stay in the originating loan contract.

Instead, it stores protocol-wide coordination state:

- loan id
- originating loan contract
- terminal status
- shared SmartNFT id
- offer-type-to-loan-contract mappings
- nonce usage by offer type

That split is important:

- loan contracts own the economics and collateral logic
- `LoanCoordinator` owns identity, classification, and note coordination

## Initialization Model

The contract is constructed with:

- hub address
- admin
- initial offer types
- initial loan contract addresses

Then it is initialized exactly once with:

- promissory note token address
- obligation receipt token address

Initialization constraints:

- only the deployer may call `initialize`
- it can only be called once
- token addresses must be non-zero

The deployment flow in `deploy/008_deploy_DirectLoanCoordinator.ts` follows this pattern by:

1. deploying `LoanCoordinator`
2. deploying `PromissoryNote` and `ObligationReceipt` as `SmartNft`
3. calling `initialize` if the coordinator is not already set up

## Offer Types And Loan Contracts

`LoanCoordinator` maintains two key mappings:

- offer type -> default loan contract
- loan contract -> offer type

In the active deployment script, the initial registrations are:

- `ASSET_OFFER_LOAN` -> `AssetOfferLoan`
- `COLLECTION_OFFER_LOAN` -> `CollectionOfferLoan`

This is more than metadata. Loan contracts depend on this mapping for:

- signature domain resolution through `_getOwnOfferType()`
- nonce partitioning by offer type
- validation that only registered loan contracts may create coordinated loans

## Loan Registration And Status

### `registerLoan`

When a registered loan contract creates a new loan, it calls `registerLoan`.

Coordinator behavior:

- verifies the caller is a registered loan contract
- checks the contract is not disabled
- increments `totalNumLoans`
- stores a new `Loan` record with status `NEW`
- emits `UpdateStatus`

The `Loan` struct in coordinator storage is intentionally small:

- `loanContract`
- `smartNftId`
- `status`

### Loan statuses

The protocol-level status enum is:

- `NOT_EXISTS`
- `NEW`
- `REPAID`
- `LIQUIDATED`

The coordinator only handles the high-level terminal state. It does not track repayment amounts or collateral.

## SmartNFT Lifecycle

### Shared SmartNFT id

Each loan gets one shared SmartNFT id, used by both:

- the promissory note
- the obligation receipt

If the loan does not yet have one, the coordinator derives it from:

- `keccak256(abi.encodePacked(address(this), smartNftIdCounter))`

So both note types for one loan point to the same logical note id.

### Minting

Only registered loan contracts can trigger minting through coordinator functions:

- `mintPromissoryNote`
- `mintObligationReceipt`

Coordinator checks:

- caller must be a registered loan contract
- loan status must still be `NEW`
- the relevant note must not already exist

### Resetting

`resetSmartNfts` burns any existing promissory note or obligation receipt for a `NEW` loan.

This is used by the loan layer during certain renegotiation flows when stored borrower or lender addresses need to be re-established before notes are re-minted.

### Resolution

When a loan is repaid or liquidated, the originating loan contract calls `resolveLoan`.

Coordinator behavior:

- requires the caller to be the original loan contract for that loan id
- moves status from `NEW` to `REPAID` or `LIQUIDATED`
- burns any existing promissory note and obligation receipt
- emits `UpdateStatus`

## Nonce Model

The coordinator owns lender/borrower offer nonces, but partitions them by offer type.

Stored shape:

- `offerType -> user -> nonce -> used`

This matters because:

- two different loan products can keep separate nonce spaces
- collection offers can reuse a nonce for repeated originations if the calling loan contract only checks, but does not invalidate, the nonce

That split explains why:

- `AssetOfferLoan` uses `checkAndInvalidateNonce`
- `CollectionOfferLoan` uses `checkNonce`

## Loan Contract Administration

Owner-only coordinator controls include:

- `registerOfferType`
- `registerOfferTypes`
- `deleteOfferType`
- `disableLoanContract`
- `enableLoanContract`

Important consequence:

- disabling a loan contract stops new registrations
- it does not erase existing loans or stop their repayment/liquidation paths

That is a useful deprecation tool rather than a full shutdown mechanism.

## `SmartNft`

### Role in the protocol

`SmartNft` is the ERC721 implementation used for both:

- `PromissoryNote`
- `ObligationReceipt`

Each token stores a lightweight link back to:

- the coordinator that minted it
- the loan id it represents

### Roles and access control

`SmartNft` uses `AccessControl`.

Important roles:

- `DEFAULT_ADMIN_ROLE`
- `BASE_URI_ROLE`
- `LOAN_COORDINATOR_ROLE`

The deployment script gives:

- admin roles to the configured protocol owner
- loan coordinator role to the deployed `LoanCoordinator`

### Minting and burning

Only addresses with `LOAN_COORDINATOR_ROLE` may:

- `mint`
- `burn`

During mint:

- `_data` must contain the loan id
- `loans[tokenId]` is recorded
- the token is safely minted

### Base URI behavior

The base URI is not used exactly as passed.

`SmartNft` appends:

- `chainId`
- trailing slash

So a deployment-time base URI such as:

- `https://metadata.nftfi.com/loans/v2/promissory/`

becomes chain-specific at runtime.

## Important Behavioral Notes

### Notes are optional until minted

The loan base layer can initially keep borrower and lender addresses directly in stored loan terms. Once notes are minted, those addresses may be deleted from loan storage and current rights are recovered from note ownership instead.

### One loan, two note types, one shared note id

That shared id makes the promissory note and obligation receipt parallel representations of the same underlying coordinated loan.

### Coordinator state is intentionally minimal

Do not expect the coordinator to be the full loan record. It is the protocol index and note manager, not the economic source of truth.

## What To Read Next

The most natural follow-on pages are:

1. escrow and personal escrow
2. NFT permit and wrapper infrastructure
3. refinancing
