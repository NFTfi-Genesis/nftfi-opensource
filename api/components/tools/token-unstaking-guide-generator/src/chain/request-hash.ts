import { BigNumberish } from '@ethersproject/bignumber';
import { keccak256 as solidityKeccak256 } from '@ethersproject/solidity';

/**
 * Recomputes a legacy `DistributorTokenLock` withdrawal-request hash exactly as the on-chain
 * `_calculateRequestHash` does: `keccak256(abi.encodePacked(uint256 amount, address user, uint256 timestamp))`.
 *
 * `solidityKeccak256` produces the tightly-packed encoding `abi.encodePacked` uses — the address is
 * packed as 20 bytes, each uint256 as 32. Getting a type or the field order wrong yields a different
 * hash, `withdrawRequests(hash)` returns false, and the real `withdraw` would revert with `no request`,
 * so the result is verified against the live mapping before any row is emitted.
 */
export const computeRequestHash = (amountRaw: BigNumberish, wallet: string, requestTimestamp: BigNumberish): string =>
  solidityKeccak256(['uint256', 'address', 'uint256'], [amountRaw, wallet, requestTimestamp]);
