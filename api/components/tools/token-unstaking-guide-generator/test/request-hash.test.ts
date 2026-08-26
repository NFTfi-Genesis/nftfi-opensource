import { computeRequestHash } from '../src/chain/request-hash';

describe('computeRequestHash', () => {
  it('matches the on-chain keccak256(abi.encodePacked(uint256, address, uint256))', () => {
    const hash = computeRequestHash(
      '18112000000000000000000',
      '0x000000000000000000000000000000000000dEaD',
      1700000000
    );
    expect(hash).toBe('0xd8eef6a00533c1efa412539054108f02415f8272d6fba60c7177be36a01caa45');
  });

  it('is case-insensitive on the wallet address (packs the same 20 bytes)', () => {
    const lower = computeRequestHash(
      '18112000000000000000000',
      '0x000000000000000000000000000000000000dead',
      1700000000
    );
    expect(lower).toBe('0xd8eef6a00533c1efa412539054108f02415f8272d6fba60c7177be36a01caa45');
  });

  it('produces a different hash when the amount changes', () => {
    const hash = computeRequestHash('1', '0x000000000000000000000000000000000000dEaD', 1700000000);
    expect(hash).not.toBe('0xd8eef6a00533c1efa412539054108f02415f8272d6fba60c7177be36a01caa45');
  });
});
