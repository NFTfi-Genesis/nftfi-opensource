# NFTfi Developer Documentation

This directory documents the active protocol, development framework, testing, deployment, and verification workflows.

The source of truth is the Solidity under `contracts/`. Deployment scripts, deployment artifacts, tests, and config are supporting material.

## Recommended Reading Order

1. [Protocol Overview](./protocol-overview.md)
2. [Contracts](./contracts/README.md)
3. [Operations](./operations/README.md)
4. [Testing](./testing/README.md)
5. [Framework](./framework/README.md)
6. [Repo Map](./repo-map.md)

## Document Map

### Root

- [Protocol Overview](./protocol-overview.md)
- [Repo Map](./repo-map.md)

### Contracts

- [Contracts Overview](./contracts/README.md)
- [Hub And Registry](./contracts/hub-and-registry.md)
- [Loan Coordinator And Smart NFTs](./contracts/loan-coordinator-and-smart-nfts.md)
- [Loan Origination Overview](./contracts/loan-origination/README.md)
- [Base Loan Stack](./contracts/loan-origination/base-loan-stack.md)
- [Asset Offer Loan](./contracts/loan-origination/asset-offer-loan.md)
- [Collection Offer Loan](./contracts/loan-origination/collection-offer-loan.md)
- [Escrow Overview](./contracts/escrow/README.md)
- [Global Escrow](./contracts/escrow/global-escrow.md)
- [Personal Escrow](./contracts/escrow/personal-escrow.md)
- [ERC20 Transfer Manager](./contracts/escrow/erc20-transfer-manager.md)
- [NFT Support Overview](./contracts/nft-support/README.md)
- [Permitted NFTs And Type Registry](./contracts/nft-support/permitted-nfts-and-type-registry.md)
- [Wrappers](./contracts/nft-support/wrappers.md)
- [Refinancing Overview](./contracts/refinancing/README.md)
- [Refinancing Core](./contracts/refinancing/refinancing-core.md)
- [Adapter Registry](./contracts/refinancing/adapter-registry.md)
- [NFTfi Adapters](./contracts/refinancing/nftfi-adapters.md)
- [External Adapters](./contracts/refinancing/external-adapters.md)

### Operations

- [Operations Overview](./operations/README.md)
- [Deployment Flow](./operations/deployment-flow.md)
- [Deployment Scripts](./operations/deployment-scripts.md)
- [Upgradeability And Redeploy Dependencies](./operations/upgradeability-and-redeploy-dependencies.md)
- [Ownership Transfer And Safe Ops](./operations/ownership-transfer-and-safe-ops.md)
- [Permit List Management](./operations/permit-list-management.md)
- [Verification And Maintenance Scripts](./operations/verification-and-maintenance-scripts.md)

### Testing

- [Testing Overview](./testing/README.md)
- [Test Strategy](./testing/test-strategy.md)
- [Hardhat Tests](./testing/hardhat-tests.md)
- [Foundry Tests](./testing/foundry-tests.md)
- [Fork Tests](./testing/fork-tests.md)
- [Fixtures And Test Utilities](./testing/fixtures-and-test-utilities.md)

### Framework

- [Framework Overview](./framework/README.md)
- [Toolchain](./framework/toolchain.md)
- [Commands](./framework/commands.md)
- [Configuration](./framework/configuration.md)
- [Environment Variables](./framework/environment-variables.md)

## Address Inventory

This top-level page includes the mainnet inventory directly.

Address data is derived from `deployments/mainnet/*.json`.

### Mainnet

| Contract | Address |
| --- | --- |
| ArcadeRefinancingAdapter | [0xB1bc99a61b262D8dB88288dBDf6414F7825B7b35](https://etherscan.io/address/0xB1bc99a61b262D8dB88288dBDf6414F7825B7b35) |
| AssetOfferLoan | [0x9F10D706D789e4c76A1a6434cd1A9841c875C0A6](https://etherscan.io/address/0x9F10D706D789e4c76A1a6434cd1A9841c875C0A6) |
| BlendRefinancingAdapter | [0x18839d3822068bAf1fd1da6C986B21B1AFaBE740](https://etherscan.io/address/0x18839d3822068bAf1fd1da6C986B21B1AFaBE740) |
| CollectionOfferLoan | [0xB6adEc2ACc851d30d5fB64f3137234BCDCBBad0D](https://etherscan.io/address/0xB6adEc2ACc851d30d5fB64f3137234BCDCBBad0D) |
| ContractKeyUtils | [0x43cD0b93B7cDF165643D362aC74CED9Ec303Ea33](https://etherscan.io/address/0x43cD0b93B7cDF165643D362aC74CED9Ec303Ea33) |
| ContractKeys | [0xD2092FABa1019ceB00cDAA209dca1d1cc231f3be](https://etherscan.io/address/0xD2092FABa1019ceB00cDAA209dca1d1cc231f3be) |
| CryptoKittiesWrapper | [0xF0c05b1aB9150664Bb09a79E7f29d025D4E3D369](https://etherscan.io/address/0xF0c05b1aB9150664Bb09a79E7f29d025D4E3D369) |
| DelegateCashPlugin | [0xf7be105003c71bBEdf377FA61855364bcF1F4832](https://etherscan.io/address/0xf7be105003c71bBEdf377FA61855364bcF1F4832) |
| ERC1155Wrapper | [0x145DeCa785aC671b7F82DD5beA34E42790fa3263](https://etherscan.io/address/0x145DeCa785aC671b7F82DD5beA34E42790fa3263) |
| ERC20TransferManager | [0x6730697f33d6D2490029b32899E7865c0d902Ca0](https://etherscan.io/address/0x6730697f33d6D2490029b32899E7865c0d902Ca0) |
| ERC721LegacyWrapper | [0xEdc4Df53cB9eDdD954dE94C0F1f33A7E065E5b12](https://etherscan.io/address/0xEdc4Df53cB9eDdD954dE94C0F1f33A7E065E5b12) |
| ERC721Wrapper | [0xf482890D6a27dA5e6a38E2aE4d6f4B7a0Dda7347](https://etherscan.io/address/0xf482890D6a27dA5e6a38E2aE4d6f4B7a0Dda7347) |
| Escrow | [0x2ae3e46290AdE43593eabd15642eBD67157f5351](https://etherscan.io/address/0x2ae3e46290AdE43593eabd15642eBD67157f5351) |
| GondiRefinancingAdapter | [0x4d72CFB5b8F642dD86cD48Dd8830f74095a52B4C](https://etherscan.io/address/0x4d72CFB5b8F642dD86cD48Dd8830f74095a52B4C) |
| LegacyNftfiRefinancingAdapterV2_1 | [0xB12dE923960Ae22263A9A5A2d289FFc730fD8A84](https://etherscan.io/address/0xB12dE923960Ae22263A9A5A2d289FFc730fD8A84) |
| LegacyNftfiRefinancingAdapterV2_3 | [0x6AC7A393437cCd95e2D9dd47a5bc0A15cFAC202F](https://etherscan.io/address/0x6AC7A393437cCd95e2D9dd47a5bc0A15cFAC202F) |
| LoanChecksAndCalculations | [0x560F32d9A54D6372429827005bD20aef4A63c898](https://etherscan.io/address/0x560F32d9A54D6372429827005bD20aef4A63c898) |
| LoanCoordinator | [0xA6D93ABC54268Cf849a93e867c129786f04fd2e6](https://etherscan.io/address/0xA6D93ABC54268Cf849a93e867c129786f04fd2e6) |
| NFTfiCollectionOfferSigningUtilsContract | [0x4ACD7A10CaC29bb7e53627F4236978A808473caB](https://etherscan.io/address/0x4ACD7A10CaC29bb7e53627F4236978A808473caB) |
| NFTfiSigningUtils | [0xd7220CBE711Aa5cc6DC15dC9dD0Bf6E5FBfe96B1](https://etherscan.io/address/0xd7220CBE711Aa5cc6DC15dC9dD0Bf6E5FBfe96B1) |
| NFTfiSigningUtilsContract | [0x898D598B1E929dD77910D296c7524b2Bb8C21889](https://etherscan.io/address/0x898D598B1E929dD77910D296c7524b2Bb8C21889) |
| NftfiHub | [0xA7C134E0Ba7295ebbd396a7C6b03a0abFd3bf417](https://etherscan.io/address/0xA7C134E0Ba7295ebbd396a7C6b03a0abFd3bf417) |
| NftfiRefinancingAdapter | [0xb2F0Ccc25f6Ffb05a03A2A1C20728455c14C0744](https://etherscan.io/address/0xb2F0Ccc25f6Ffb05a03A2A1C20728455c14C0744) |
| ObligationReceipt | [0x48ed998e778Ab2663b6C49Bd09DfFF8Efd16B934](https://etherscan.io/address/0x48ed998e778Ab2663b6C49Bd09DfFF8Efd16B934) |
| PermittedNFTsAndTypeRegistry | [0xC4D7226265616Ad4d866033110C17144aCE1af6e](https://etherscan.io/address/0xC4D7226265616Ad4d866033110C17144aCE1af6e) |
| PersonalEscrow | [0xC8eB63Ad2541D51712a09F0CCd168B0b67f1A857](https://etherscan.io/address/0xC8eB63Ad2541D51712a09F0CCd168B0b67f1A857) |
| PersonalEscrowFactory | [0xE1958e02bE00b9a64A2F0d87f9D823F6c5283d4a](https://etherscan.io/address/0xE1958e02bE00b9a64A2F0d87f9D823F6c5283d4a) |
| PromissoryNote | [0x77B53beb7f13Bd38de9F76Eed2F2c4F9efff7f4C](https://etherscan.io/address/0x77B53beb7f13Bd38de9F76Eed2F2c4F9efff7f4C) |
| PunkWrapper | [0x100dd9D062Ed34fba33141C5F901db7a30Aa3c86](https://etherscan.io/address/0x100dd9D062Ed34fba33141C5F901db7a30Aa3c86) |
| Refinancing | [0x4BC5Fa56f2931E7A37417FA55Dda71E4b7c2f2a3](https://etherscan.io/address/0x4BC5Fa56f2931E7A37417FA55Dda71E4b7c2f2a3) |
| SuperRareV1Wrapper | [0x97B6ac36f2336b9780A12bFF3988D92744D7f22B](https://etherscan.io/address/0x97B6ac36f2336b9780A12bFF3988D92744D7f22B) |
