# Refinancing

This subsection covers how the protocol refinances existing NFT-backed positions into new NFTfi loans.

Current coverage:

- [Refinancing Core](./refinancing-core.md)
- [Adapter Registry](./adapter-registry.md)
- [NFTfi Adapters](./nftfi-adapters.md)
- [External Adapters](./external-adapters.md)

## Scope

The main questions here are:

- how the refinancing contract pays off an old position and starts a new NFTfi loan
- how flashloans and swaps fit into that process
- how the protocol chooses an adapter for the old position
- how current NFTfi, legacy NFTfi, and third-party protocols differ in refinancing behavior
