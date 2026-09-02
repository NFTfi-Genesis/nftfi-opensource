# NFTfi Open Source

> ⚠️ **Archived / Open Source Release.** This repository contains the complete open-source codebase of the NFTfi platform, released as the NFTfi project winds down. All code is provided strictly **as-is, with no support, active maintenance, warranties, or guarantees**. You are free to fork, adapt, and run this software under the terms of the [MIT License](LICENSE).

---

## Repository Structure

This monorepo brings together the core components of the NFTfi ecosystem:

```text
nftfi-opensource/
├── smart-contracts/   # NFTfi Protocol V3 smart contracts, tests (Hardhat & Foundry), and deployment artifacts
├── api/               # Marketplace backend microservices (NestJS, PostgreSQL, Redis, RabbitMQ)
├── frontend/          # Web application (React, TypeScript, Vite)
├── LICENSE            # MIT License
└── .gitmodules        # Submodule configuration (forge-std for smart contracts)
```

### Components

* **[`smart-contracts/`](smart-contracts/README.md)**: The production NFTfi V3 lending protocol on Ethereum Mainnet. Includes asset-offer loans, collection-offer loans, transferable promissory notes and obligation receipts (`SmartNft`), global and personal escrow custody, token wrappers, and atomic refinancing adapters (Arcade, Blur/Blend, Gondi, legacy NFTfi). Fully reproducible byte-for-byte against deployed Mainnet bytecode.
* **[`api/`](api/README.md)**: The NFTfi SDK API microservices managing loan indexing, off-chain offer storage, orderbook queries, asset metadata, and notifications.
* **[`frontend/`](frontend/README.md)**: The web interface for browsing loans, submitting borrower listings, signing lender offers, refinancing, and managing repayments.

---

## Getting Started

### Clone with Submodules

The smart contract test suite relies on the `forge-std` submodule. Clone recursively:

```bash
git clone --recurse-submodules <repository-url>
```

Or initialize submodules in an existing clone:

```bash
git submodule update --init --recursive
```

### Development Guides

Please refer to the individual component directories for setup, dependencies, and execution instructions:

* [Smart Contracts Guide](smart-contracts/README.md) & [Architecture Handover Docs](smart-contracts/docs/handover-docs/README.md)
* [API Setup Guide](api/README.md)
* [Frontend Setup Guide](frontend/README.md)

---

## Trademark Notice

The NFTfi name, logo, and trademarks are not included in the MIT license. Forked projects must use distinct branding and must not present themselves as affiliated with or endorsed by NFTfi.

---

## Disclaimer & Limitation of Liability

1. **Software Provided "As Is":** This software, including all smart contracts, backend code, and frontend interfaces, is provided "as is" and "as available", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, non-infringement, security, or error-free operation.
2. **No Financial or Investment Advice:** Nothing in this repository constitutes financial, investment, legal, or tax advice. The software is experimental Web3 tooling designed for decentralized, peer-to-peer interactions.
3. **Assumption of Risk:** Any person or entity deploying, forking, running, or interacting with this software acknowledges and accepts the inherent risks of cryptographic systems, decentralized finance (DeFi), smart contract bugs or vulnerabilities, blockchain forks, extreme market volatility, and potential total loss of funds or digital assets.
4. **No Custody or Operator Status:** The authors, contributors, and copyright holders do not operate, control, or custody any funds, loans, or collateral deployed or utilized by third parties using this code.
5. **Limitation of Liability:** In no event shall the authors, copyright holders, or contributors be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

---

## License

All code in this repository is licensed under the [MIT License](LICENSE), unless otherwise specified in third-party dependency directories.
