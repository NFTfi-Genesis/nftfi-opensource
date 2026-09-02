# NFT Support

This subsection covers how the protocol decides which NFT contracts are supported and how it abstracts over different transfer/approval/ownership behaviors.

Current coverage:

- [Permitted NFTs And Type Registry](./permitted-nfts-and-type-registry.md)
- [Wrappers](./wrappers.md)

## Scope

The main questions here are:

- how an NFT collection becomes supported collateral
- how the protocol maps a collection to an NFT type
- how an NFT type maps to a wrapper implementation
- why wrappers are required for non-standard collections and custody behavior
