# Escrow And Custody

This subsection covers how the protocol stores collateral, hands custody between loan contexts, and handles ERC20 repayment transfers that may need escrow fallback behavior.

Coverage:

- [Global Escrow](./global-escrow.md)
- [Personal Escrow](./personal-escrow.md)
- [ERC20 Transfer Manager](./erc20-transfer-manager.md)

## Scope

The main custody questions this section answers are:

- where collateral actually lives during a loan
- how global and personal escrow differ
- how collateral can be handed over between loans or escrow contexts
- how airdrops and stuck-token recovery are constrained
- how ERC20 repayment movement is isolated from the loan contracts
